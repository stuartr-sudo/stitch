/**
 * VideoProductionGuidePage — comprehensive guide to video styles, models,
 * frameworks, generation modes, and production best practices in Stitch.
 *
 * Covers: 86 video style presets (6 categories), 13 video models, 76 structural
 * frameworks, generation modes (I2V, FLF, Multi-Shot, R2V, Motion Transfer),
 * prompt writing, troubleshooting, and production workflows.
 */

import React, { useState, useMemo } from 'react';
import {
  ChevronDown, ChevronRight, Film, Wand2, Sparkles, Play, Pause,
  AlertTriangle, Lightbulb, Layers, Zap, ArrowRight, Settings,
  Clock, CheckCircle2, XCircle, DollarSign, Monitor, Smartphone,
  Camera, Video, Image as ImageIcon, Search, BookOpen, Eye,
  Target, Palette, Volume2, VolumeX, LayoutGrid, Music,
  Clapperboard, SlidersHorizontal, Gauge, Users, Globe, Flame,
  Brush, Baby, Ghost, Cpu, TrendingUp, Scissors, RefreshCw,
  Move, Crosshair, Grid3X3, UserCircle, Compass, ListChecks,
  Copy, Megaphone, Rocket, Brain, Utensils, Dumbbell, Heart,
  MapPin, Briefcase, Gamepad2, Skull, FlaskConical, GraduationCap,
  CircleDot, Telescope, PawPrint, Trophy, Package, RotateCcw,
} from 'lucide-react';

// ── Reusable UI Components ──────────────────────────────────────────────────

function Section({ icon: Icon, title, children, defaultOpen = false, badge }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-5 py-4 bg-white hover:bg-gray-50 transition-colors text-left"
      >
        <Icon className="w-5 h-5 text-[#2C666E] shrink-0" />
        <span className="font-semibold text-gray-900 flex-1">{title}</span>
        {badge && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#2C666E]/10 text-[#2C666E]">{badge}</span>
        )}
        {open
          ? <ChevronDown className="w-4 h-4 text-gray-400" />
          : <ChevronRight className="w-4 h-4 text-gray-400" />
        }
      </button>
      {open && (
        <div className="px-5 pb-5 bg-white border-t border-gray-100">
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
        <h4 className="font-semibold text-gray-900 mb-1">{title}</h4>
        <div className="text-sm text-gray-600 space-y-2">{children}</div>
      </div>
    </div>
  );
}

function Tip({ children }) {
  return (
    <div className="mt-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 flex gap-2">
      <Lightbulb className="w-4 h-4 shrink-0 mt-0.5" />
      <div>{children}</div>
    </div>
  );
}

function Warning({ children }) {
  return (
    <div className="mt-3 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800 flex gap-2">
      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
      <div>{children}</div>
    </div>
  );
}

function InfoBox({ children }) {
  return (
    <div className="mt-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 flex gap-2">
      <Lightbulb className="w-4 h-4 shrink-0 mt-0.5" />
      <div>{children}</div>
    </div>
  );
}

function Badge({ label, color = 'bg-gray-100 text-gray-700' }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}

// ── Style Category Cards ────────────────────────────────────────────────────

const STYLE_CATEGORIES = [
  {
    id: 'realistic',
    label: 'Realistic / UGC',
    icon: Smartphone,
    color: 'from-orange-500 to-red-500',
    badgeColor: 'bg-orange-100 text-orange-700',
    count: 15,
    description: 'Authentic handheld smartphone, UGC testimonials, TikTok creator content, vlog styles',
    bestFor: 'Social media ads, influencer-style content, product reviews, testimonials',
    styles: [
      { key: 'iphone_selfie', label: 'Smartphone Selfie (Raw)', desc: 'Natural room lighting, handheld micro-shake, raw unfiltered look. Best when you want raw authenticity.' },
      { key: 'iphone_selfie_walking', label: 'Walking Selfie', desc: 'Vlogging while walking — rhythmic bounce from walking gait, urban background blur. Great for street-level energy.' },
      { key: 'iphone_selfie_car', label: 'Car Selfie', desc: 'Dashboard or handheld in car, natural window light, casual driving vlog feel. Road vibration adds realism.' },
      { key: 'iphone_selfie_outdoor', label: 'Outdoor Selfie', desc: 'Park/beach/nature setting, bright sunlight, wind-blown hair. Captures open-air energy and authenticity.' },
      { key: 'ugc_testimonial', label: 'UGC Testimonial', desc: 'Person speaking to camera with genuine micro-expressions. Soft ambient indoor lighting. The gold standard for social proof ads.' },
      { key: 'ugc_unboxing', label: 'Unboxing', desc: 'Hands opening packaging on a table — overhead angle, genuine first-reaction excitement. Perfect for e-commerce product launches.' },
      { key: 'ugc_before_after', label: 'Before & After', desc: 'Transformation reveal with dramatic lighting shift between states. Ideal for fitness, beauty, and renovation content.' },
      { key: 'ugc_storytime', label: 'Storytime', desc: 'Cozy confessional on a couch with warm lamp lighting. Creates intimate connection for personal narrative content.' },
      { key: 'tiktok_style', label: 'TikTok/Reels Style', desc: 'Ring light, expressive reactions, energetic direct-to-camera. The default creator content look that audiences trust.' },
      { key: 'tiktok_grwm', label: 'GRWM (Get Ready With Me)', desc: 'Vanity mirror setup with beauty ring light, makeup/styling routine. Popular beauty and lifestyle format.' },
      { key: 'tiktok_pov', label: 'POV Storytelling', desc: 'First-person perspective — the camera becomes the viewer. Dramatic reveals and immersive narrative. Great for hooks.' },
      { key: 'tiktok_tutorial', label: 'Quick Tutorial', desc: 'Clean overhead or eye-level step-by-step how-to. Clear instructional framing with deliberate pacing.' },
      { key: 'facetime_call', label: 'FaceTime/Video Call', desc: 'Webcam angle from above, screen glow on face. Casual at-home video call aesthetic — relatable and informal.' },
      { key: 'vlog_bts', label: 'Vlog / Behind-the-Scenes', desc: 'Casual creator workspace, messy desk, authentic unscripted handheld. Shows the real process.' },
      { key: 'podcast_interview', label: 'Podcast / Interview', desc: 'Studio podcast setup with professional mics, warm broadcast lighting. Authority-building conversational format.' },
    ],
  },
  {
    id: 'professional',
    label: 'Professional / Commercial',
    icon: Camera,
    color: 'from-blue-500 to-indigo-500',
    badgeColor: 'bg-blue-100 text-blue-700',
    count: 18,
    description: 'Cinematic film looks, commercial ads, product demos, corporate video, documentaries',
    bestFor: 'Brand campaigns, product launches, corporate videos, real estate, training content',
    styles: [
      { key: 'cinematic', label: 'Cinematic', desc: 'Anamorphic lens, teal-orange grade, shallow depth of field. The flagship "movie look" — use for hero content and brand films.' },
      { key: 'cinematic_golden_hour', label: 'Golden Hour Cinematic', desc: 'Warm backlit magic hour, sun flares, amber/honey tones. Romantic and epic. Ideal for lifestyle and aspiration.' },
      { key: 'cinematic_night', label: 'Night Cinematic', desc: 'Neon-lit urban nightscape, moody blue tones, wet street reflections. Atmospheric and brooding — great for dramatic content.' },
      { key: 'cinematic_anamorphic', label: 'Anamorphic Widescreen', desc: 'Ultra-wide letterbox, horizontal lens flares, epic scale. The Hollywood blockbuster look. Use sparingly for maximum impact.' },
      { key: 'documentary', label: 'Documentary', desc: 'Handheld observational style, natural available light, muted journalistic tones. Credible and grounded.' },
      { key: 'documentary_interview', label: 'Sit-Down Interview', desc: 'Single camera, shallow DOF, dark background. Intimate talking-head — standard for serious storytelling.' },
      { key: 'documentary_nature', label: 'Nature Documentary', desc: 'Wildlife macro details, aerial vistas, pristine natural world. Premium nature content quality.' },
      { key: 'documentary_street', label: 'Street / Urban Doc', desc: 'Gritty handheld, real urban locations, available light. Raw journalistic authenticity for city stories.' },
      { key: 'commercial', label: 'Commercial/Ad', desc: 'Polished studio production, warm aspirational palette. The clean, premium default for paid advertising.' },
      { key: 'commercial_luxury', label: 'Luxury Brand Ad', desc: 'Slow-motion reveals, dark backgrounds, gold accents. Ultra-premium — use for high-end products and luxury positioning.' },
      { key: 'commercial_lifestyle', label: 'Lifestyle Ad', desc: 'Aspirational family/friends, warm sunny energy. Feel-good brand content that connects emotionally.' },
      { key: 'commercial_fast_paced', label: 'Fast-Paced / Dynamic Ad', desc: 'Quick cuts, motion blur, bold colors. High-energy for sports, tech, and action brands.' },
      { key: 'product_demo', label: 'Product Demo', desc: 'Clean product on neutral background, even studio lighting. Sharp detail-focused framing for showcasing features.' },
      { key: 'product_demo_hands_on', label: 'Hands-On Demo', desc: 'Human hands interacting with the product. Close-up tactile engagement shows real usage and build quality.' },
      { key: 'product_demo_macro', label: 'Macro Detail Shot', desc: 'Extreme close-up of product surface, shallow DOF. Premium material textures — use for hero product shots.' },
      { key: 'product_demo_360', label: '360 Product Spin', desc: 'Rotating turntable, clean backdrop, even lighting. Complete product overview from all angles.' },
      { key: 'corporate_training', label: 'Corporate / Training', desc: 'Clean office environment, professional presenter. Business aesthetic for internal communications and onboarding.' },
      { key: 'real_estate', label: 'Real Estate Tour', desc: 'Wide-angle interiors, golden hour light, architectural walkthroughs. Aspirational lifestyle framing for property.' },
    ],
  },
  {
    id: 'artistic',
    label: 'Artistic / Stylized',
    icon: Brush,
    color: 'from-purple-500 to-pink-500',
    badgeColor: 'bg-purple-100 text-purple-700',
    count: 17,
    description: 'Dreamy, vintage, noir, anime, cyberpunk, fantasy, stop motion, watercolor',
    bestFor: 'Creative campaigns, music videos, artistic shorts, distinctive brand identity',
    styles: [
      { key: 'dreamy', label: 'Dreamy/Ethereal', desc: 'Soft diffusion glow, pastel palette, golden bokeh. Romantic overexposed highlights — ideal for beauty and wellness.' },
      { key: 'dreamy_fairy_tale', label: 'Fairy Tale', desc: 'Enchanted forest, magical golden particles, dappled sunlight. Mystical storybook wonder for fantasy content.' },
      { key: 'dreamy_golden_haze', label: 'Golden Haze', desc: 'Warm backlit haze, sun flare through hair, romantic soft focus. Amber honey tones for intimate, dreamy sequences.' },
      { key: 'dreamy_underwater', label: 'Underwater Dream', desc: 'Slow-motion submerged look, light caustics, flowing fabric. Serene aquatic weightlessness — unique and arresting.' },
      { key: 'vintage', label: 'Vintage/Retro', desc: '16mm film grain, warm amber tones, vignette edges. Nostalgic lifted blacks — great for storytelling and memoir.' },
      { key: 'vintage_70s', label: '70s Film', desc: 'Warm orange-brown palette, soft film grain, retro decor. Golden nostalgic warmth for period or throwback content.' },
      { key: 'vintage_vhs', label: '80s VHS', desc: 'Scan lines, tracking artifacts, neon pink-cyan. CRT glow and synthwave nostalgia — highly distinctive.' },
      { key: 'vintage_super8', label: 'Super 8mm', desc: 'Heavy film grain, gate weave, blown highlights. Intimate home-movie nostalgia for raw, personal stories.' },
      { key: 'noir', label: 'Film Noir', desc: 'High contrast chiaroscuro, dramatic shadows, venetian blind patterns. Classic detective atmosphere with smoke.' },
      { key: 'noir_neo', label: 'Neo-Noir', desc: 'Modern city rain, neon through venetian blinds, teal-magenta accents. Contemporary dark thriller aesthetic.' },
      { key: 'noir_detective', label: 'Detective / Mystery', desc: 'Evidence in spotlight, smoke wisps, suspenseful reveals. Classic mystery atmosphere for true crime or thriller content.' },
      { key: 'noir_silhouette', label: 'Silhouette / Shadow Play', desc: 'Stark backlit figures, long dramatic shadows. Minimal detail, maximum drama — powerful for emotional moments.' },
      { key: 'anime', label: 'Anime Style', desc: 'Vibrant cel-shaded animation, expressive characters, detailed backgrounds. Dynamic angles for pop-culture content.' },
      { key: 'cyberpunk_neon', label: 'Cyberpunk / Neon', desc: 'Rain-soaked neon streets, holographic elements, purple-cyan palette. Futuristic noir for tech and gaming niches.' },
      { key: 'fantasy_epic', label: 'Fantasy / Epic', desc: 'Sweeping mythical landscapes, dramatic storm lighting, majestic scale. Epic grandeur for story-driven content.' },
      { key: 'stop_motion', label: 'Stop Motion', desc: 'Claymation feel, handcrafted miniature sets, tactile textures. Charming frame-by-frame motion — highly shareable.' },
      { key: 'watercolor_painterly', label: 'Watercolor / Painterly', desc: 'Soft flowing pigments, translucent washes, visible brush textures. Painted aesthetic for art and wellness brands.' },
    ],
  },
  {
    id: 'faceless',
    label: 'Faceless / B-Roll',
    icon: Eye,
    color: 'from-teal-500 to-cyan-500',
    badgeColor: 'bg-teal-100 text-teal-700',
    count: 10,
    description: 'No people — landscapes, tech, abstract, food, travel, luxury objects',
    bestFor: 'Faceless YouTube channels, B-roll overlays, ambient content, product-only videos',
    styles: [
      { key: 'faceless_cinematic', label: 'Faceless Cinematic', desc: 'Dramatic landscapes, objects, and environments with cinematic framing. The go-to faceless style for quality content.' },
      { key: 'faceless_tech', label: 'Faceless Tech', desc: 'Screens, circuits, data visualizations, futuristic imagery. Perfect for AI/tech/SaaS faceless channels.' },
      { key: 'faceless_nature', label: 'Faceless Nature', desc: 'Stunning nature footage, macro details, aerial landscapes. Ideal for meditation, wellness, and nature channels.' },
      { key: 'faceless_abstract', label: 'Faceless Abstract', desc: 'Abstract shapes, particles, gradients, motion graphics feel. Great for music backgrounds and creative fillers.' },
      { key: 'faceless_dark', label: 'Faceless Dark/Horror', desc: 'Eerie environments, shadows, abandoned spaces. Atmospheric dread for horror, mystery, and paranormal niches.' },
      { key: 'motion_graphics', label: 'Motion Graphics', desc: 'Infographic-style with bold shapes, icons, kinetic typography feel. Professional explainer and data content.' },
      { key: 'stock_footage', label: 'Stock B-Roll', desc: 'Generic professional B-roll — versatile and clean. Use as filler or transition material between key scenes.' },
      { key: 'faceless_food', label: 'Faceless Food/Cooking', desc: 'Overhead food styling, macro ingredient details, warm kitchen lighting. Recipe and food channel essential.' },
      { key: 'faceless_travel', label: 'Faceless Travel', desc: 'Aerial landscapes, turquoise waters, golden-hour destinations. Wanderlust aesthetic for travel channels.' },
      { key: 'faceless_luxury', label: 'Faceless Luxury/Lifestyle', desc: 'Premium products, marble surfaces, golden accents. Editorial brand photography without people.' },
    ],
  },
  {
    id: 'kids',
    label: 'Kids / Animation',
    icon: Baby,
    color: 'from-pink-400 to-yellow-400',
    badgeColor: 'bg-pink-100 text-pink-700',
    count: 26,
    description: 'Cartoon, 3D animation, storybook, educational, preschool, puppet, watercolor',
    bestFor: 'Kids YouTube channels, educational content, family entertainment, bedtime stories',
    styles: [
      { key: 'kids_cartoon', label: 'Kids Cartoon', desc: 'Bright friendly animation, big expressive eyes, vibrant primary colors. The default kids content look.' },
      { key: 'kids_3d_animation', label: '3D Kids Animation', desc: 'Premium 3D studio quality — soft lighting, rounded characters, vibrant worlds. Highest production value for kids.' },
      { key: 'whiteboard_explainer', label: 'Whiteboard / Explainer', desc: 'Hand-drawn diagrams on white background, marker illustrations. Clean educational infographic style.' },
      { key: 'kids_fairy_tale', label: 'Fairy Tale', desc: 'Enchanted storybook world, castles, magical creatures, soft golden glow and sparkle effects.' },
      { key: 'kids_storybook', label: 'Storybook Illustration', desc: 'Hand-painted watercolor pages coming to life. Soft edges, gentle pastel tones, bedtime story warmth.' },
      { key: 'kids_educational', label: 'Kids Educational', desc: 'Fun learning animation with labeled diagrams, counting objects, colorful infographic elements.' },
      { key: 'kids_preschool', label: 'Preschool', desc: 'Ultra-simple shapes and bold primary colors. Gentle slow pacing — toddler-friendly animation.' },
      { key: 'kids_flat_vector', label: 'Flat Vector Kids', desc: 'Clean flat-design vector art, crisp geometric shapes. Modern minimal illustration with bright fills.' },
      { key: 'kids_space', label: 'Kids Space Adventure', desc: 'Cartoon outer space with friendly aliens, colorful planets, rocket ships, twinkling star fields.' },
      { key: 'kids_action', label: 'Kids Action', desc: 'Dynamic superhero energy with bold colors, speed lines, comic-panel transitions, heroic poses.' },
      { key: 'kids_garden', label: 'Whimsical Garden', desc: 'Miniature garden world with talking flowers, friendly bugs, dewdrop sparkles, lush green magic.' },
      { key: 'kids_city', label: 'Kids City', desc: 'Colorful cartoon city, friendly vehicles, busy streets, playful architecture, community energy.' },
      { key: 'kids_stop_motion', label: 'Kids Claymation', desc: 'Handmade clay and felt characters, visible thumbprint textures, warm craft studio lighting.' },
      { key: 'kids_watercolor', label: 'Kids Watercolor', desc: 'Soft watercolor washes, gentle color bleeding, dreamy hand-painted nature scenes.' },
      { key: 'kids_puppet', label: 'Puppet Show', desc: 'Felt and fabric puppet characters on a miniature stage, curtain frames, warm theatrical lighting.' },
      { key: 'kids_soft_cartoon', label: 'Soft Kids Cartoon', desc: 'Gentle 2D animation with thin clean outlines. Pastel flat colors, rounded friendly characters.' },
      { key: 'kids_family_cartoon', label: 'Family Cartoon', desc: 'Warm family-friendly 2D animation. Thin outlines, gentle colors, suburban home settings.' },
      { key: 'kids_school_cartoon', label: 'Kids School', desc: 'Soft educational cartoon set in school classrooms. Gentle colors, warm learning environment.' },
      { key: 'kids_cozy_cartoon', label: 'Cozy Cartoon', desc: 'Ultra-cozy warm animation, soft rounded shapes. Tea party and indoor comfort scenes.' },
      { key: 'kids_maker_edu', label: 'Edu Maker', desc: 'Educational maker cartoon with numbers, letters, clean shapes. Bright STEM learning aesthetic.' },
      { key: 'kids_nature_island', label: 'Nature Island', desc: 'Soft textured nature illustration, muted earthy tones, gentle organic shapes, wildlife warmth.' },
      { key: 'kids_gentle_meadow', label: 'Gentle Meadow', desc: 'Dreamy meadow landscape, soft muted watercolor textures. Warm golden light, calming earthy palette.' },
      { key: 'kids_gentle_ocean', label: 'Gentle Ocean', desc: 'Soft underwater illustration, muted pastel ocean colors. Gentle coral reef scenes, calming aquatic world.' },
      { key: 'kids_sitcom_cartoon', label: 'Classic Sitcom Cartoon', desc: 'Classic American animated sitcom style, flat colors, simple shapes. Long-running comedy aesthetic.' },
      { key: 'kids_3d_character', label: '3D Character Art', desc: 'Stylized 3D character design with big expressive eyes, detailed outfits, colorful panel backgrounds.' },
      { key: 'kids_candy_city', label: 'Candy City 3D', desc: 'Whimsical 3D candy-colored city, pastel buildings, pink clouds, toylike vibrant playful world.' },
    ],
  },
];

// ── Video Models Data ───────────────────────────────────────────────────────

const VIDEO_MODELS_DATA = [
  {
    key: 'fal_veo3',
    name: 'Veo 3.1 (Google)',
    tier: 'Premium',
    provider: 'FAL.ai',
    durations: '4s, 6s, 8s',
    modes: ['I2V', 'FLF', 'R2V', 'Extend'],
    audio: true,
    strengths: ['Best overall quality and prompt adherence', 'First-Last-Frame (FLF) mode for scene-to-scene continuity', 'Strong at realistic human motion', 'Audio generation built-in'],
    weaknesses: ['Most expensive per second', 'Cannot use white-background references for R2V (use Grok instead)', 'Fixed duration steps only (4/6/8s)'],
    bestFor: 'Hero content, brand films, and any scene requiring premium quality. The default choice for Shorts FLF mode.',
    cost: '~$0.25-0.40/generation',
  },
  {
    key: 'fal_veo3_lite',
    name: 'Veo 3.1 Lite (Google)',
    tier: 'Mid',
    provider: 'FAL.ai',
    durations: '4s, 6s, 8s',
    modes: ['I2V', 'FLF'],
    audio: true,
    strengths: ['60% cheaper than full Veo 3.1', 'Same FLF capability', 'Same duration options', 'Audio generation'],
    weaknesses: ['Slightly lower quality than full Veo 3.1', 'No R2V support'],
    bestFor: 'High-volume production where you need FLF continuity but want to save costs. Great for iterating before committing to full Veo.',
    cost: '~$0.10-0.16/generation',
  },
  {
    key: 'fal_kling_v3',
    name: 'Kling V3 Pro',
    tier: 'Premium',
    provider: 'FAL.ai',
    durations: '5s, 10s',
    modes: ['I2V', 'FLF', 'Multi-Shot', 'Motion Transfer'],
    audio: true,
    strengths: ['Multi-Shot mode — up to 6 shots in one API call', 'Excellent character consistency across shots', 'Natural scene transitions', 'Audio generation', 'Motion Transfer support'],
    weaknesses: ['Can be slower to process than Veo', 'Multi-Shot limited to 15s total'],
    bestFor: 'Multi-shot sequences, character-driven narratives, and motion transfer. Choose this when you need consistent characters across multiple scenes.',
    cost: '~$0.11/second',
  },
  {
    key: 'fal_kling_o3',
    name: 'Kling O3 Pro',
    tier: 'Premium',
    provider: 'FAL.ai',
    durations: '5s, 10s',
    modes: ['I2V', 'FLF', 'Multi-Shot', 'R2V'],
    audio: true,
    strengths: ['Multi-Shot mode (same as V3)', 'R2V with multi-element support (up to 4 characters)', 'Audio generation', 'Strong character reference fidelity'],
    weaknesses: ['Higher cost', 'R2V requires careful reference image preparation'],
    bestFor: 'Character reference videos (R2V) and multi-character scenes. The go-to for turnaround sheet to video pipeline.',
    cost: '~$0.11/second',
  },
  {
    key: 'fal_kling',
    name: 'Kling 2.0 Master',
    tier: 'Budget',
    provider: 'FAL.ai',
    durations: '5s, 10s',
    modes: ['I2V'],
    audio: false,
    strengths: ['Lower cost', 'Good general I2V quality', 'Reliable and consistent'],
    weaknesses: ['No FLF, Multi-Shot, or R2V modes', 'No audio', 'Older model with less detail'],
    bestFor: 'Budget I2V when you need reliable results without premium features.',
    cost: '~$0.05/second',
  },
  {
    key: 'fal_wan25',
    name: 'Wan 2.5 Preview',
    tier: 'Budget',
    provider: 'FAL.ai',
    durations: '3s, 5s',
    modes: ['I2V'],
    audio: false,
    strengths: ['Very low cost', 'Good motion quality for the price', 'Fast processing'],
    weaknesses: ['Short max duration (5s)', 'No FLF or multi-shot', 'Less detail than premium models'],
    bestFor: 'Quick iterations and tests. Use for experimenting with prompts before committing to premium models.',
    cost: '~$0.02-0.04/generation',
  },
  {
    key: 'fal_wan_pro',
    name: 'Wan Pro',
    tier: 'Mid',
    provider: 'FAL.ai',
    durations: 'Fixed (~5s)',
    modes: ['I2V'],
    audio: false,
    strengths: ['Better quality than Wan 2.5', 'Moderate cost'],
    weaknesses: ['No duration control', 'No FLF or multi-shot'],
    bestFor: 'Mid-tier I2V when Wan 2.5 isn\'t quite enough but you don\'t need premium features.',
    cost: '~$0.05/generation',
  },
  {
    key: 'fal_pixverse_v6',
    name: 'PixVerse V6',
    tier: 'Mid',
    provider: 'FAL.ai',
    durations: '5s, 8s',
    modes: ['I2V'],
    audio: true,
    strengths: ['Audio generation (uses generate_audio_switch)', 'Good stylized/animated content', 'Mid-range pricing'],
    weaknesses: ['Less realistic than Veo/Kling for live-action', 'Different audio parameter name'],
    bestFor: 'Stylized or animated content where you want built-in audio. Good for kids and artistic styles.',
    cost: '~$0.08/generation',
  },
  {
    key: 'fal_pixverse',
    name: 'PixVerse v4.5',
    tier: 'Budget',
    provider: 'FAL.ai',
    durations: '4s',
    modes: ['I2V'],
    audio: false,
    strengths: ['Low cost', 'Fast'],
    weaknesses: ['Short duration only', 'Older model', 'No audio'],
    bestFor: 'Quick, cheap test generations.',
    cost: '~$0.03/generation',
  },
  {
    key: 'fal_hailuo',
    name: 'Hailuo (MiniMax)',
    tier: 'Mid',
    provider: 'FAL.ai',
    durations: 'Fixed (~6s)',
    modes: ['I2V'],
    audio: false,
    strengths: ['Good general quality', 'Handles diverse art styles well'],
    weaknesses: ['No duration control', 'No FLF or advanced modes'],
    bestFor: 'General-purpose I2V with decent quality at moderate cost.',
    cost: '~$0.06/generation',
  },
  {
    key: 'fal_grok_video',
    name: 'Grok Imagine I2V',
    tier: 'Mid',
    provider: 'FAL.ai',
    durations: '1-10s',
    modes: ['I2V', 'R2V', 'Extend'],
    audio: true,
    strengths: ['Flexible duration (1-10s in 1s increments)', 'R2V works with white-background references', 'Audio on by default', 'Video extend support'],
    weaknesses: ['Audio defaults to ON (must explicitly disable)', 'Newer model — less tested'],
    bestFor: 'R2V with turnaround sheets (handles white backgrounds that Veo cannot). Also good for flexible durations.',
    cost: '~$0.08/generation',
  },
  {
    key: 'fal_veo2',
    name: 'Veo 2 (Google)',
    tier: 'Mid',
    provider: 'FAL.ai',
    durations: '4s, 6s, 8s',
    modes: ['I2V'],
    audio: false,
    strengths: ['Good quality, previous-gen Google model', 'Same duration options as Veo 3.1'],
    weaknesses: ['Superseded by Veo 3.1 in quality', 'No FLF, audio, or R2V'],
    bestFor: 'Legacy fallback. Generally prefer Veo 3.1 or Veo 3.1 Lite.',
    cost: '~$0.12/generation',
  },
  {
    key: 'wavespeed_wan',
    name: 'Wavespeed WAN',
    tier: 'Budget',
    provider: 'Wavespeed',
    durations: '5s, 8s',
    modes: ['I2V'],
    audio: false,
    strengths: ['Lowest cost option', 'Wavespeed provider (different infrastructure)'],
    weaknesses: ['Lower quality', 'No advanced modes', 'Different polling system'],
    bestFor: 'Minimum cost testing and experimentation.',
    cost: '~$0.02/generation',
  },
];

// ── Generation Modes Data ───────────────────────────────────────────────────

const GENERATION_MODES = [
  {
    id: 'i2v',
    name: 'Image-to-Video (I2V)',
    icon: Play,
    color: 'bg-blue-500',
    description: 'The simplest mode: take a still keyframe image and animate it. The AI generates motion from the image plus your text prompt.',
    howItWorks: [
      'Generate a keyframe image for the scene (Step 3 of Shorts Workbench)',
      'Select a video model and motion prompt describing the desired movement',
      'The AI animates the still image, generating a video clip',
      'The last frame is extracted and used as the starting image for the next scene (continuity chaining)',
    ],
    supportedModels: 'All 13 models',
    whenToUse: 'Default mode for most content. Use when you have a clear keyframe image and want straightforward animation.',
    tips: [
      'Motion prompts should describe MOVEMENT, not scene description — "slow camera push forward, character turns head left" not "a person standing in a room"',
      'Last-frame extraction chains scenes together automatically — each scene starts where the previous ended',
      'Shorter clips (3-5s) tend to have better motion quality than longer ones (8-10s)',
    ],
  },
  {
    id: 'flf',
    name: 'First-Last-Frame (FLF)',
    icon: Layers,
    color: 'bg-green-500',
    description: 'Provide BOTH a start frame and end frame. The AI generates motion that transitions between the two images. This gives you precise control over where each scene starts and ends.',
    howItWorks: [
      'Generate keyframe images for BOTH the start and end of each scene',
      'The AI creates a video that smoothly transitions from the first frame to the last frame',
      'You control exactly what the viewer sees at the beginning and end of each clip',
      'The last frame of scene N becomes the first frame of scene N+1 automatically',
    ],
    supportedModels: 'Veo 3.1, Veo 3.1 Lite, Kling V3 Pro, Kling O3 Pro',
    whenToUse: 'When you need precise control over scene transitions. The gold standard for Shorts with smooth cross-scene continuity.',
    tips: [
      'FLF is auto-selected when you choose a supported model — no manual toggle needed',
      'Both frames should be visually related but different enough to create interesting motion',
      'Avoid frames that are too different — the AI may create jarring or unrealistic transitions',
      'FLF works best at 4-6s durations; 8s can sometimes produce wandering motion in the middle',
    ],
  },
  {
    id: 'multishot',
    name: 'Multi-Shot (Kling 3.0)',
    icon: Clapperboard,
    color: 'bg-purple-500',
    description: 'Send ALL your scene prompts in a single API call. Kling 3.0 generates one continuous video with model-managed scene transitions and character consistency across up to 6 shots.',
    howItWorks: [
      'Select Kling V3 Pro or Kling O3 Pro as your video model',
      'Enable Multi-Shot mode in Step 4 of the Shorts Workbench',
      'All scene prompts and durations are sent as one request',
      'Kling generates a single video with all shots composited together',
      'Character consistency is maintained by the model across all shots',
    ],
    supportedModels: 'Kling V3 Pro, Kling O3 Pro only',
    whenToUse: 'When character consistency across scenes is critical. Also saves credits — 1 API call instead of 3-6. Best for narrative shorts with a consistent character.',
    tips: [
      'Maximum 6 shots, 15 seconds total',
      'Each shot needs its own prompt describing what happens in that segment',
      'Use "customize" shot type for manual control, or "intelligent" to let Kling decide camera angles',
      'You can optionally provide a start frame image for the first shot',
      'Multi-Shot produces one continuous video — scene boundaries are handled by the model',
    ],
  },
  {
    id: 'r2v',
    name: 'Reference-to-Video (R2V)',
    icon: Users,
    color: 'bg-orange-500',
    description: 'Provide reference images of your character(s) and the AI generates a video of them performing actions from your prompt. Maintains character identity without needing an initial scene frame.',
    howItWorks: [
      'Prepare reference images: frontal portrait + full-body shots',
      'Optionally generate references from a Turnaround Sheet (R2V Reference pose set)',
      'Provide a motion prompt describing what the character should do',
      'The AI generates a video featuring your character(s)',
      'Kling O3 supports up to 4 elements with 3 references each',
    ],
    supportedModels: 'Kling O3 Pro, Grok Imagine I2V, Veo 3.1',
    whenToUse: 'When you have a designed character and want to generate videos featuring them in different scenarios. Perfect for brand mascots and consistent character series.',
    tips: [
      'Veo 3.1 R2V CANNOT handle white-background references — use Grok or add scene backgrounds',
      'The Turnaround Sheet wizard has a "Generate R2V Video" button that auto-maps cells to R2V elements',
      'Frontal portraits give the best face fidelity; full-body shots help with proportions',
      'Reference prompts containing the character use @Element1, @Element2 syntax in Kling',
      'For turnaround-to-R2V, use the "Gray Background" or "Scene Environment" background mode',
    ],
  },
  {
    id: 'motion_transfer',
    name: 'Motion Transfer',
    icon: RefreshCw,
    color: 'bg-pink-500',
    description: 'Extract motion from a reference video and apply it to a still character image. Your character performs the exact movements from the reference while keeping its visual style.',
    howItWorks: [
      'Provide a still character image (photo, illustration, 3D render)',
      'Provide a reference video with the desired motion (dance, gesture, action)',
      'Optionally trim the reference video to the exact segment you want',
      'The AI extracts the motion skeleton and renders your character performing it',
    ],
    supportedModels: 'WAN 2.2 (budget), Kling V3 Pro (premium)',
    whenToUse: 'When you have a specific motion (dance, gesture, walk cycle) and want your character to perform it exactly. Great for viral dance trends with branded characters.',
    tips: [
      'Simple, clear motions transfer best — avoid multi-person scenes in the reference',
      'WAN 2.2 is cheaper but has no orientation control; Kling V3 offers Match Image / Match Video modes',
      'Available in Shorts Workbench (Step 4), Video Ad Creator, and Storyboard Production',
      'See the dedicated Motion Transfer guide tab for detailed model comparisons',
    ],
  },
];

// ── Searchable Style Explorer ───────────────────────────────────────────────

function StyleExplorer() {
  const [search, setSearch] = useState('');
  const [expandedCat, setExpandedCat] = useState(null);

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return STYLE_CATEGORIES;
    const q = search.toLowerCase();
    return STYLE_CATEGORIES.map((cat) => ({
      ...cat,
      styles: cat.styles.filter(
        (s) =>
          s.label.toLowerCase().includes(q) ||
          s.desc.toLowerCase().includes(q) ||
          cat.label.toLowerCase().includes(q)
      ),
    })).filter((cat) => cat.styles.length > 0);
  }, [search]);

  return (
    <div>
      {/* Search bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search styles... (e.g. 'cinematic', 'kids', 'selfie', 'noir')"
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:border-[#2C666E] focus:ring-1 focus:ring-[#2C666E] outline-none transition-colors text-gray-900"
        />
      </div>

      {/* Category cards */}
      <div className="space-y-4">
        {filteredCategories.map((cat) => (
          <div key={cat.id} className="border border-gray-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setExpandedCat(expandedCat === cat.id ? null : cat.id)}
              className="w-full flex items-center gap-4 px-5 py-4 bg-white hover:bg-gray-50 transition-colors text-left"
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center`}>
                <cat.icon className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">{cat.label}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${cat.badgeColor}`}>{cat.count} styles</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{cat.description}</p>
              </div>
              {expandedCat === cat.id
                ? <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
              }
            </button>

            {expandedCat === cat.id && (
              <div className="px-5 pb-5 border-t border-gray-100 bg-white">
                <div className="mt-3 px-4 py-2.5 bg-[#2C666E]/5 border border-[#2C666E]/15 rounded-lg">
                  <p className="text-xs text-[#07393C]"><strong>Best for:</strong> {cat.bestFor}</p>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-3">
                  {cat.styles.map((style) => (
                    <div key={style.key} className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start gap-2">
                        <div className="shrink-0 mt-0.5">
                          <Palette className="w-3.5 h-3.5 text-[#2C666E]" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{style.label}</p>
                          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{style.desc}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredCategories.length === 0 && (
        <div className="text-center py-8 text-gray-400 text-sm">
          No styles match "{search}". Try a different search term.
        </div>
      )}
    </div>
  );
}

// ── Main Guide Content ─────────────────────────────────────────────────────

export function VideoProductionGuideContent() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">
      {/* Hero */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-[#2C666E]/10 border border-[#2C666E]/20 rounded-full mb-4">
          <Film className="w-5 h-5 text-[#2C666E]" />
          <span className="text-sm font-bold text-[#2C666E]">Video Production Guide</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Master Video Production in Stitch</h1>
        <p className="text-gray-500 max-w-2xl mx-auto">
          Everything you need to know about video styles, models, generation modes, prompt writing,
          and production workflows. From your first Shorts clip to multi-shot cinematic sequences.
        </p>
      </div>

      {/* Quick orientation */}
      <div className="bg-gradient-to-br from-[#2C666E] to-[#1a4a52] rounded-2xl p-6 text-white">
        <h2 className="text-xl font-bold mb-2">How Video Production Works</h2>
        <p className="text-white/80 text-sm leading-relaxed mb-4">
          Every video in Stitch follows the same core pipeline: <strong>Keyframe Image</strong> (what the scene looks like)
          + <strong>Video Style</strong> (how it moves and feels) + <strong>Video Model</strong> (which AI generates it)
          + <strong>Generation Mode</strong> (how scenes connect). Understanding these four layers gives you full creative control.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <ImageIcon className="w-5 h-5 mx-auto mb-1 text-white/80" />
            <div className="text-xs font-medium">Keyframe</div>
            <div className="text-[10px] text-white/50 mt-0.5">The still image</div>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <Palette className="w-5 h-5 mx-auto mb-1 text-white/80" />
            <div className="text-xs font-medium">Video Style</div>
            <div className="text-[10px] text-white/50 mt-0.5">Motion & feel</div>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <Cpu className="w-5 h-5 mx-auto mb-1 text-white/80" />
            <div className="text-xs font-medium">Video Model</div>
            <div className="text-[10px] text-white/50 mt-0.5">Which AI renders</div>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <Layers className="w-5 h-5 mx-auto mb-1 text-white/80" />
            <div className="text-xs font-medium">Gen Mode</div>
            <div className="text-[10px] text-white/50 mt-0.5">How scenes connect</div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* SECTION 1: VIDEO STYLE PRESETS */}
      {/* ══════════════════════════════════════════════════════════════════ */}

      <Section icon={Palette} title="Video Style Presets — The 86 Looks" badge="86 styles" defaultOpen>
        <div className="mt-3 text-sm text-gray-600 space-y-3">
          <p>
            Video style presets control <strong>how your video moves and feels</strong> — the camera work, lighting,
            color grading, motion quality, and overall aesthetic. They're appended to your motion prompt when
            generating clips, giving the AI detailed cinematography direction.
          </p>
          <p>
            Each preset is a carefully crafted ~100-word prompt covering camera movement, lighting, color temperature,
            texture, framing, and mood. They range from raw smartphone selfies to premium cinematic film looks.
          </p>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-gray-50 rounded-xl border border-gray-200">
              <div className="text-2xl font-bold text-[#2C666E]">86</div>
              <div className="text-xs text-gray-500">Total Presets</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-xl border border-gray-200">
              <div className="text-2xl font-bold text-[#2C666E]">6</div>
              <div className="text-xs text-gray-500">Categories</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-xl border border-gray-200">
              <div className="text-2xl font-bold text-[#2C666E]">~100</div>
              <div className="text-xs text-gray-500">Words per Prompt</div>
            </div>
          </div>

          <h4 className="font-semibold text-gray-900 mt-5">How to choose a style</h4>
          <ol className="list-decimal list-inside space-y-1.5">
            <li><strong>Match your audience:</strong> UGC/Realistic for social media trust, Professional for brand credibility, Kids for family content.</li>
            <li><strong>Match your niche:</strong> Horror channels use Noir/Dark, tech uses Faceless Tech, food uses Faceless Food.</li>
            <li><strong>Match your platform:</strong> TikTok/Reels audiences respond to Realistic; YouTube brand content benefits from Professional/Cinematic.</li>
            <li><strong>Consider consistency:</strong> Pick one style per video. Mixing styles within a short creates jarring visual disconnects.</li>
          </ol>

          <Tip>
            In the Shorts Workbench, video styles are selected in Step 3 (Keyframes) and applied automatically
            to all scene clips. In the Storyboard workspace, they're configured in Settings before script generation.
          </Tip>

          <h4 className="font-semibold text-gray-900 mt-5 mb-2">Browse All 86 Styles</h4>
          <StyleExplorer />
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* SECTION 2: VIDEO MODELS */}
      {/* ══════════════════════════════════════════════════════════════════ */}

      <Section icon={Cpu} title="Video Models — Which AI to Use" badge="13 models">
        <div className="mt-3 text-sm text-gray-600 space-y-3">
          <p>
            Stitch supports <strong>13 video generation models</strong> across two providers (FAL.ai and Wavespeed).
            Each model has different strengths, costs, and supported generation modes. Choosing the right model
            for your content type is the single biggest factor in output quality.
          </p>

          <h4 className="font-semibold text-gray-900 mt-4">Quick Decision Guide</h4>
          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <p className="text-xs font-bold text-purple-700 uppercase mb-1">Best Overall Quality</p>
              <p className="text-sm font-semibold text-gray-900">Veo 3.1</p>
              <p className="text-xs text-gray-500">Premium, FLF support, audio</p>
            </div>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs font-bold text-blue-700 uppercase mb-1">Best Value</p>
              <p className="text-sm font-semibold text-gray-900">Veo 3.1 Lite</p>
              <p className="text-xs text-gray-500">60% cheaper, same FLF</p>
            </div>
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-xs font-bold text-green-700 uppercase mb-1">Best for Characters</p>
              <p className="text-sm font-semibold text-gray-900">Kling V3/O3 Pro</p>
              <p className="text-xs text-gray-500">Multi-shot, R2V, motion transfer</p>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs font-bold text-amber-700 uppercase mb-1">Cheapest Testing</p>
              <p className="text-sm font-semibold text-gray-900">Wan 2.5 / Wavespeed WAN</p>
              <p className="text-xs text-gray-500">~$0.02/gen, fast iteration</p>
            </div>
          </div>

          <h4 className="font-semibold text-gray-900 mt-5">All 13 Models</h4>
          <div className="space-y-3 mt-3">
            {VIDEO_MODELS_DATA.map((m) => (
              <ModelDetailCard key={m.key} model={m} />
            ))}
          </div>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* SECTION 3: GENERATION MODES */}
      {/* ══════════════════════════════════════════════════════════════════ */}

      <Section icon={Layers} title="Generation Modes — How Scenes Connect" badge="5 modes">
        <div className="mt-3 text-sm text-gray-600 space-y-3">
          <p>
            Generation modes determine <strong>how the AI creates and connects your video clips</strong>.
            The mode is determined by your model choice and content needs. Understanding modes is key to
            professional-quality output.
          </p>

          <div className="space-y-4 mt-4">
            {GENERATION_MODES.map((mode) => (
              <div key={mode.id} className="border border-gray-200 rounded-xl p-4 bg-white">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-8 h-8 rounded-lg ${mode.color} flex items-center justify-center`}>
                    <mode.icon className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">{mode.name}</h4>
                    <p className="text-xs text-gray-400">{mode.supportedModels}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-3">{mode.description}</p>

                <div className="mb-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1.5">How it works</p>
                  <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                    {mode.howItWorks.map((step, i) => <li key={i}>{step}</li>)}
                  </ol>
                </div>

                <div className="px-3 py-2 bg-[#2C666E]/5 border border-[#2C666E]/15 rounded-lg mb-3">
                  <p className="text-xs text-[#07393C]"><strong>When to use:</strong> {mode.whenToUse}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1.5">Pro tips</p>
                  <ul className="text-xs text-gray-500 space-y-1">
                    {mode.tips.map((tip, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <Lightbulb className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* SECTION 3B: CAMERA CONTROL SYSTEM */}
      {/* ══════════════════════════════════════════════════════════════════ */}

      <Section icon={Crosshair} title="Camera Control System — Per-Scene Direction" badge="16 presets">
        <div className="mt-3 text-sm text-gray-600 space-y-3">
          <p>
            The camera control system gives you <strong>per-scene camera direction</strong> with structured, composable controls.
            Instead of writing freeform camera movement text, you select from organized layers that combine into precise
            cinematography instructions.
          </p>
          <p>
            Camera controls override the default motion in your video style preset, giving you scene-specific control
            while keeping the overall visual aesthetic.
          </p>

          <h4 className="font-semibold text-gray-900 mt-4">16 Quick Presets</h4>
          <p>Each preset combines movement, speed, angle, and framing into a ready-to-use camera direction.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            {[
              { name: 'Hero Reveal', desc: 'Slow dolly in, low angle, medium shot. Builds power and importance.' },
              { name: 'Establishing Pan', desc: 'Medium-speed pan right, eye level, wide shot. Classic scene-setter.' },
              { name: 'Dramatic Zoom', desc: 'Fast zoom in, eye level to extreme close-up. Impact and urgency.' },
              { name: 'Surveillance', desc: 'Static high-angle wide shot. Observational, voyeuristic feel.' },
              { name: 'Intimate', desc: 'Very slow push in, eye level close-up. Emotional connection.' },
              { name: 'Orbit Reveal', desc: 'Slow orbit right, eye level, medium shot. Reveals depth and context.' },
              { name: 'Epic Crane', desc: 'Slow crane up, low angle, wide. Rising grandeur and scale.' },
              { name: 'Documentary', desc: 'Handheld, medium speed, eye level, medium shot. Natural and authentic.' },
              { name: 'God View', desc: 'Static bird\'s eye, extreme wide. Omniscient perspective.' },
              { name: 'Tracking Chase', desc: 'Fast tracking, eye level, medium. Following action and energy.' },
              { name: 'Tension', desc: 'Slow dolly in, Dutch angle, close-up. Unease and suspense.' },
              { name: 'Pullback Reveal', desc: 'Medium dolly out, eye level, close-up to wide. Context reveal.' },
              { name: 'Whip Transition', desc: 'Fast whip pan, eye level, medium. High-energy scene bridge.' },
              { name: 'Descending', desc: 'Slow crane down, high to eye level, wide to close-up. Narrowing focus.' },
              { name: 'Tilt Reveal', desc: 'Slow tilt up, low angle, medium to extreme wide. Scale and grandeur.' },
              { name: 'Detail Inspect', desc: 'Very slow zoom in, eye level, extreme close-up. Texture and detail.' },
            ].map((p) => (
              <div key={p.name} className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                <p className="text-sm font-semibold text-gray-900">{p.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{p.desc}</p>
              </div>
            ))}
          </div>

          <h4 className="font-semibold text-gray-900 mt-5">Custom Camera Controls — 4 Layers</h4>
          <p>When presets don't fit, build your own camera direction from four composable layers:</p>

          <div className="space-y-3 mt-3">
            <div className="border border-gray-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Move className="w-4 h-4 text-[#2C666E]" />
                <p className="font-semibold text-gray-900 text-sm">Movement (16 options)</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {['Static', 'Pan Left', 'Pan Right', 'Tilt Up', 'Tilt Down', 'Dolly In', 'Dolly Out',
                  'Orbit Left', 'Orbit Right', 'Tracking', 'Crane Up', 'Crane Down', 'Zoom In',
                  'Zoom Out', 'Handheld', 'Whip Pan'].map((m) => (
                  <span key={m} className="px-2 py-0.5 bg-gray-100 rounded text-[10px] font-medium text-gray-600">{m}</span>
                ))}
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Gauge className="w-4 h-4 text-[#2C666E]" />
                <p className="font-semibold text-gray-900 text-sm">Speed (4 options)</p>
              </div>
              <div className="flex gap-3">
                {[
                  { label: 'Very Slow', desc: 'Glacial, barely perceptible' },
                  { label: 'Slow', desc: 'Gentle and deliberate' },
                  { label: 'Medium', desc: 'Smooth and steady' },
                  { label: 'Fast', desc: 'Swift and dynamic' },
                ].map((s) => (
                  <div key={s.label} className="flex-1 px-2 py-1.5 bg-gray-50 rounded text-center">
                    <p className="text-xs font-semibold text-gray-900">{s.label}</p>
                    <p className="text-[10px] text-gray-400">{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Compass className="w-4 h-4 text-[#2C666E]" />
                <p className="font-semibold text-gray-900 text-sm">Angle (6 options)</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {['Eye Level', 'Low Angle', 'High Angle', 'Dutch Angle', "Bird's Eye", "Worm's Eye"].map((a) => (
                  <span key={a} className="px-2 py-0.5 bg-gray-100 rounded text-[10px] font-medium text-gray-600">{a}</span>
                ))}
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Grid3X3 className="w-4 h-4 text-[#2C666E]" />
                <p className="font-semibold text-gray-900 text-sm">Framing (5 options)</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {['Extreme Wide', 'Wide', 'Medium', 'Close-Up', 'Extreme Close-Up'].map((f) => (
                  <span key={f} className="px-2 py-0.5 bg-gray-100 rounded text-[10px] font-medium text-gray-600">{f}</span>
                ))}
              </div>
            </div>
          </div>

          <h4 className="font-semibold text-gray-900 mt-5">Presets vs. Custom: When to Use Which</h4>
          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-xs font-bold text-green-700 uppercase mb-1.5">Use Presets When...</p>
              <ul className="text-xs text-green-800 space-y-1">
                <li>You need quick, proven camera direction</li>
                <li>The preset matches your scene intent closely</li>
                <li>You're prototyping and want to move fast</li>
                <li>Consistency matters more than precision</li>
              </ul>
            </div>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs font-bold text-blue-700 uppercase mb-1.5">Use Custom When...</p>
              <ul className="text-xs text-blue-800 space-y-1">
                <li>No preset matches the exact camera work you want</li>
                <li>You need a specific combination of layers</li>
                <li>You want different speeds for similar movements</li>
                <li>Fine-tuning a scene after initial generation</li>
              </ul>
            </div>
          </div>

          <h4 className="font-semibold text-gray-900 mt-5">Camera Preset Decision Matrix</h4>
          <p>Quick reference for matching content types to camera presets:</p>

          <div className="overflow-x-auto mt-2">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 pr-3 font-semibold text-gray-700">Content Type</th>
                  <th className="text-left py-2 pr-3 font-semibold text-gray-700">Primary Preset</th>
                  <th className="text-left py-2 font-semibold text-gray-700">Alt Presets</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr><td className="py-2 pr-3 font-medium">Product reveal</td><td className="py-2 pr-3">Hero Reveal</td><td className="py-2">Orbit Reveal, Pullback Reveal</td></tr>
                <tr><td className="py-2 pr-3 font-medium">Scene introduction</td><td className="py-2 pr-3">Establishing Pan</td><td className="py-2">Epic Crane, God View</td></tr>
                <tr><td className="py-2 pr-3 font-medium">Horror/suspense</td><td className="py-2 pr-3">Tension</td><td className="py-2">Surveillance, Detail Inspect</td></tr>
                <tr><td className="py-2 pr-3 font-medium">Action sequence</td><td className="py-2 pr-3">Tracking Chase</td><td className="py-2">Whip Transition, Dramatic Zoom</td></tr>
                <tr><td className="py-2 pr-3 font-medium">Emotional moment</td><td className="py-2 pr-3">Intimate</td><td className="py-2">Descending, Detail Inspect</td></tr>
                <tr><td className="py-2 pr-3 font-medium">Documentary/UGC</td><td className="py-2 pr-3">Documentary</td><td className="py-2">Establishing Pan, Pullback Reveal</td></tr>
                <tr><td className="py-2 pr-3 font-medium">Epic/cinematic</td><td className="py-2 pr-3">Epic Crane</td><td className="py-2">Tilt Reveal, God View</td></tr>
                <tr><td className="py-2 pr-3 font-medium">Transition scene</td><td className="py-2 pr-3">Whip Transition</td><td className="py-2">Pullback Reveal, Dramatic Zoom</td></tr>
                <tr><td className="py-2 pr-3 font-medium">Macro/detail</td><td className="py-2 pr-3">Detail Inspect</td><td className="py-2">Intimate, Orbit Reveal</td></tr>
              </tbody>
            </table>
          </div>

          <Tip>
            Camera configs are set per-scene in the Shorts Workbench (Step 4) and Storyboard Production.
            Each scene can have a completely different camera setup. The camera prompt is injected alongside
            your video style preset — the camera controls override the default motion in the style.
          </Tip>

          <Warning>
            Camera control only affects motion prompts — it does not change the keyframe image.
            If your camera config specifies "low angle" but the keyframe was generated as an eye-level shot,
            the video model will attempt to reconcile both signals, which can produce unexpected results.
            For best results, match your keyframe perspective to your camera angle.
          </Warning>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* SECTION 3C: CHARACTER SYSTEM & CAMEOS */}
      {/* ══════════════════════════════════════════════════════════════════ */}

      <Section icon={UserCircle} title="Character System & Cameos" badge="NEW">
        <div className="mt-3 text-sm text-gray-600 space-y-3">
          <p>
            The character system provides lightweight character management for maintaining consistent
            characters across scenes and videos. Upload a face photo, and Stitch auto-generates a detailed
            visual description via GPT Vision.
          </p>

          <h4 className="font-semibold text-gray-900 mt-4">Creating Characters</h4>
          <Step number="1" title="Upload a Reference Photo">
            <p>
              Provide a clear face photo — frontal, well-lit, minimal background clutter. This becomes the
              character's visual identity. PNG or JPEG, under 5MB.
            </p>
          </Step>
          <Step number="2" title="Name Your Character">
            <p>
              Give the character a recognizable name. This is used in scene assignments and prompt injection.
            </p>
          </Step>
          <Step number="3" title="Auto-Description via GPT Vision">
            <p>
              When you save, GPT-4 Vision analyzes the photo and generates a detailed visual description
              covering facial features, hair, skin tone, build, and distinguishing characteristics.
              This description is injected into keyframe generation prompts for consistency.
            </p>
          </Step>

          <h4 className="font-semibold text-gray-900 mt-5">Using Characters in Production</h4>
          <ul className="space-y-2 mt-2">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
              <span><strong>CharacterPicker in Step 3 (Keyframes):</strong> Select up to 3 characters per scene. Their descriptions are woven into the image generation prompt.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
              <span><strong>Per-scene assignment:</strong> Different scenes can feature different characters. Scene 1 might show Character A alone, Scene 3 might show Characters A and B together.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
              <span><strong>Prompt injection:</strong> Character descriptions are automatically appended to the LLM prompt synthesis — no manual prompt editing needed.</span>
            </li>
          </ul>

          <h4 className="font-semibold text-gray-900 mt-5">Characters vs. LoRA Training</h4>
          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 border border-gray-200 rounded-lg">
              <p className="text-xs font-bold text-[#2C666E] uppercase mb-1.5">Characters (Lightweight)</p>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>Upload one photo, instant setup</li>
                <li>Description-based consistency</li>
                <li>Free — no training cost</li>
                <li>Good for general human characters</li>
                <li>Works across all image models</li>
              </ul>
            </div>
            <div className="p-3 border border-gray-200 rounded-lg">
              <p className="text-xs font-bold text-[#2C666E] uppercase mb-1.5">LoRA Training (Heavy)</p>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>Upload 10-20 photos, training takes minutes</li>
                <li>Pixel-level identity fidelity</li>
                <li>$2-5 per training run</li>
                <li>Essential for brand mascots and stylized characters</li>
                <li>Works with LoRA-compatible models only</li>
              </ul>
            </div>
          </div>

          <InfoBox>
            <strong>When to use which:</strong> Start with Characters for quick prototyping and realistic human faces.
            Upgrade to LoRA training when you need pixel-perfect brand mascot consistency or a stylized character
            (cartoon, anime, 3D) that text descriptions can't accurately reproduce.
          </InfoBox>

          <h4 className="font-semibold text-gray-900 mt-5">Character Consistency Tips</h4>
          <ul className="space-y-1.5 mt-2">
            <li className="flex items-start gap-1.5">
              <Lightbulb className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
              <span>Use the same character across all scenes in a Short for narrative coherence</span>
            </li>
            <li className="flex items-start gap-1.5">
              <Lightbulb className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
              <span>Combine Characters with FLF mode — the last frame carries appearance details forward</span>
            </li>
            <li className="flex items-start gap-1.5">
              <Lightbulb className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
              <span>For multi-character scenes, keep the total to 2-3 max — too many characters confuse the model</span>
            </li>
            <li className="flex items-start gap-1.5">
              <Lightbulb className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
              <span>Reference images (I2I) in Step 3 give even stronger consistency — use your character's photo as the reference</span>
            </li>
          </ul>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* SECTION 3D: IMAGE GENERATION & VISUAL STYLES */}
      {/* ══════════════════════════════════════════════════════════════════ */}

      <Section icon={ImageIcon} title="Image Generation & Visual Styles" badge="8 models + 137 styles">
        <div className="mt-3 text-sm text-gray-600 space-y-3">
          <p>
            Before video generation happens, every scene needs a <strong>keyframe image</strong>.
            Image generation uses a separate set of models and styles from video. Understanding
            this layer is crucial — a great keyframe leads to great video; a poor keyframe produces
            poor video regardless of which video model you use.
          </p>

          <h4 className="font-semibold text-gray-900 mt-4">8 Image Models</h4>
          <div className="space-y-2 mt-3">
            {[
              { name: 'Nano Banana 2', provider: 'FAL.ai', strengths: 'Fastest, cheapest, great for iteration. Supports multi-image I2I composition.', cost: '~$0.01', best: 'Quick prototyping, bulk generation, multi-style tests' },
              { name: 'Flux 2', provider: 'FAL.ai', strengths: 'High detail, LoRA support, excellent text rendering.', cost: '~$0.03', best: 'When you need text in images, LoRA-powered character generation' },
              { name: 'SeedDream v4.5', provider: 'FAL.ai', strengths: 'Excellent photorealism, strong prompt adherence.', cost: '~$0.03', best: 'Realistic photography, product shots, portrait scenes' },
              { name: 'Imagen 4', provider: 'FAL.ai', strengths: 'Google\'s latest. Strong composition and accurate anatomy.', cost: '~$0.04', best: 'Complex multi-subject scenes, precise anatomy' },
              { name: 'Kling Image v3', provider: 'FAL.ai', strengths: 'Good character consistency, matches Kling video output style.', cost: '~$0.03', best: 'When pairing with Kling video models for visual consistency' },
              { name: 'Grok Imagine', provider: 'FAL.ai', strengths: 'Creative interpretations, stylized output, unique aesthetic.', cost: '~$0.03', best: 'Artistic content, unique visual takes, creative experimentation' },
              { name: 'Ideogram v2', provider: 'FAL.ai', strengths: 'Best text-in-image rendering of any model.', cost: '~$0.04', best: 'Logos, posters, any scene requiring legible text' },
              { name: 'Wavespeed', provider: 'Wavespeed', strengths: 'Lowest cost, fast processing.', cost: '~$0.01', best: 'Budget generation, testing prompts cheaply' },
            ].map((m) => (
              <div key={m.name} className="border border-gray-100 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-semibold text-gray-900">{m.name}</p>
                  <span className="px-1.5 py-0.5 bg-gray-100 rounded text-[9px] font-medium text-gray-500">{m.provider}</span>
                  <span className="px-1.5 py-0.5 bg-green-50 rounded text-[9px] font-medium text-green-600">{m.cost}</span>
                </div>
                <p className="text-xs text-gray-500">{m.strengths}</p>
                <p className="text-xs text-gray-400 mt-0.5"><strong>Best for:</strong> {m.best}</p>
              </div>
            ))}
          </div>

          <h4 className="font-semibold text-gray-900 mt-5">14 Shorts Visual Styles</h4>
          <p>
            These are the <strong>image aesthetic styles</strong> used specifically in the Shorts Workbench (Step 3).
            They control the look and feel of keyframe images. They are separate from the 86 video style presets
            (which control motion/cinematography).
          </p>
          <InfoBox>
            <strong>Key distinction:</strong> Visual styles (image) control what the keyframe LOOKS like.
            Video style presets control how the video MOVES and feels. They work together but are independent choices.
          </InfoBox>

          <h4 className="font-semibold text-gray-900 mt-5">123 StyleGrid Presets</h4>
          <p>
            The full visual style system used across Imagineer, Ads Manager, and image regeneration throughout Stitch.
            Organized into categories with detailed ~50-word prompt descriptions per style. Loaded via the
            <code className="px-1 py-0.5 bg-gray-100 rounded text-[10px]">StyleGrid</code> component.
          </p>
          <div className="grid grid-cols-3 gap-3 mt-2">
            <div className="text-center p-3 bg-gray-50 rounded-xl border border-gray-200">
              <div className="text-2xl font-bold text-[#2C666E]">123</div>
              <div className="text-xs text-gray-500">StyleGrid Presets</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-xl border border-gray-200">
              <div className="text-2xl font-bold text-[#2C666E]">14</div>
              <div className="text-xs text-gray-500">Shorts Visual Styles</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-xl border border-gray-200">
              <div className="text-2xl font-bold text-[#2C666E]">86</div>
              <div className="text-xs text-gray-500">Imagineer Styles</div>
            </div>
          </div>

          <h4 className="font-semibold text-gray-900 mt-5">I2I Reference Images</h4>
          <p>
            In Step 3, each scene supports an <strong>Image-to-Image (I2I) reference</strong>. This guides the
            image model to match the visual characteristics of your reference while generating the scene's keyframe.
          </p>
          <ul className="space-y-1.5 mt-2">
            <li className="flex items-start gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
              <span><strong>From library:</strong> Select a previously saved image from your Library</span>
            </li>
            <li className="flex items-start gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
              <span><strong>From URL:</strong> Paste any image URL as a reference</span>
            </li>
            <li className="flex items-start gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
              <span><strong>Previous scene frame:</strong> Use the last frame of a prior scene for continuity</span>
            </li>
          </ul>

          <h4 className="font-semibold text-gray-900 mt-5">Keyframe Prompt Synthesis</h4>
          <p>
            You don't write image prompts manually (though you can edit them). The LLM synthesizes a single
            optimized prompt from three inputs:
          </p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <div className="p-3 bg-gray-50 rounded-lg text-center border border-gray-200">
              <p className="text-xs font-semibold text-gray-900">Narration Text</p>
              <p className="text-[10px] text-gray-400 mt-0.5">What's being said</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg text-center border border-gray-200">
              <p className="text-xs font-semibold text-gray-900">Visual Style</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Art direction</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg text-center border border-gray-200">
              <p className="text-xs font-semibold text-gray-900">Niche Mood</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Atmosphere/color</p>
            </div>
          </div>
          <p className="mt-2">
            GPT-4.1-mini takes these three inputs and composes one cohesive image prompt — no manual
            concatenation or template strings. Character descriptions are also injected if characters are assigned.
          </p>

          <Warning>
            Do not confuse the six style systems: (1) Visual Styles (14, Shorts keyframes), (2) StyleGrid Presets
            (123, shared across tools), (3) Video Style Presets (86, motion/cinematography), (4) Turnaround Pose Sets
            (8, turnaround sheets), (5) Video Style Frameworks (76, story structure), (6) Carousel Style Templates
            (8, text layout). Each controls a different layer.
          </Warning>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* SECTION 3E: INTERACTIVE STYLE DECISION GUIDE */}
      {/* ══════════════════════════════════════════════════════════════════ */}

      <StyleDecisionGuide />

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* SECTION 3F: NICHE MASTERY GUIDE */}
      {/* ══════════════════════════════════════════════════════════════════ */}

      <NicheMasteryGuide />

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* SECTION 3G: NEW FEATURES GUIDE */}
      {/* ══════════════════════════════════════════════════════════════════ */}

      <Section icon={Rocket} title="New Features Guide" badge="NEW">
        <div className="mt-3 text-sm text-gray-600 space-y-3">

          <h4 className="font-semibold text-gray-900">Video Analysis & Remix</h4>
          <p>
            The <strong>Video Analyzer</strong> lets you reverse-engineer any video. Paste a URL, and GPT Vision
            analyzes the structure, style, pacing, camera work, transitions, and hooks. Then click "Recreate This"
            to auto-populate a Shorts Workbench with the detected settings.
          </p>
          <Step number="1" title="Open Video Analyzer">
            <p>Available from the Video Ad Creator page. Click the analyze button and paste any video URL.</p>
          </Step>
          <Step number="2" title="Review Analysis">
            <p>
              The analyzer breaks down: hook type, scene count, average shot duration, camera movements,
              color palette, pacing rhythm, music mood, and visual style.
            </p>
          </Step>
          <Step number="3" title="Recreate or Adapt">
            <p>
              Click "Recreate This" to pre-fill a new Short with the detected settings. Or use the analysis
              as inspiration to manually configure your own variation.
            </p>
          </Step>

          <h4 className="font-semibold text-gray-900 mt-5">Production Queue & Autopilot</h4>
          <p>
            The <strong>Production Queue</strong> at <code className="px-1 py-0.5 bg-gray-100 rounded text-[10px]">/queue</code> manages
            batch Shorts production. Add items with topic, niche, and settings, then process them individually
            or enable Autopilot for hands-free production.
          </p>
          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-xs font-bold text-gray-700 uppercase mb-1">Manual Mode</p>
              <p className="text-xs text-gray-500">Add items to the queue, reorder by priority, kick off individual items when ready. Full control over each step.</p>
            </div>
            <div className="p-3 bg-[#2C666E]/5 border border-[#2C666E]/15 rounded-lg">
              <p className="text-xs font-bold text-[#2C666E] uppercase mb-1">Autopilot Mode</p>
              <p className="text-xs text-gray-500">Enable Autopilot and the worker processes the queue automatically — scripting, voiceover, keyframes, clips, and assembly with no manual intervention.</p>
            </div>
          </div>
          <Tip>
            Queue items use the default niche settings (voice, visual style, framework) unless overridden.
            Configure your niche defaults in the Queue Settings panel before enabling Autopilot.
          </Tip>

          <h4 className="font-semibold text-gray-900 mt-5">Multi-Platform Repurposing</h4>
          <p>
            After producing a Short, the <strong>Repurpose Panel</strong> generates platform-optimized metadata
            and format variants for multiple destinations:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
            {[
              { platform: 'YouTube Shorts', desc: 'Vertical, #Shorts tag, SEO title' },
              { platform: 'TikTok', desc: 'Hook-first caption, trending tags' },
              { platform: 'Instagram Reels', desc: 'Emoji-rich, 30 hashtags' },
              { platform: 'YouTube Landscape', desc: '16:9 letterbox, full SEO' },
            ].map((p) => (
              <div key={p.platform} className="p-2 bg-gray-50 rounded-lg border border-gray-100 text-center">
                <p className="text-xs font-semibold text-gray-900">{p.platform}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{p.desc}</p>
              </div>
            ))}
          </div>
          <p className="mt-2">
            Each platform gets tailored title, description, hashtags, and posting recommendations.
            YouTube Landscape also generates a 16:9 letterboxed version of the video.
          </p>

          <h4 className="font-semibold text-gray-900 mt-5">Ad Cloning</h4>
          <p>
            The <strong>Ad Clone</strong> tool analyzes competitor video ads and extracts a "clone recipe" —
            hook strategy, visual style, pacing pattern, CTA approach, and emotional arc. You can then
            adapt the recipe to your own brand and product.
          </p>
          <ul className="space-y-1.5 mt-2">
            <li className="flex items-start gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
              <span><strong>Analyze:</strong> Paste a video URL or upload — GPT Vision breaks down the ad structure</span>
            </li>
            <li className="flex items-start gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
              <span><strong>Clone Recipe:</strong> Get a structured breakdown: hook type, scene flow, visual direction, CTA</span>
            </li>
            <li className="flex items-start gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
              <span><strong>Adapt:</strong> Apply the recipe to your brand — same structure, your product and messaging</span>
            </li>
          </ul>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* SECTION 4: STRUCTURAL FRAMEWORKS */}
      {/* ══════════════════════════════════════════════════════════════════ */}

      <Section icon={LayoutGrid} title="Structural Frameworks — The 76 Story Templates" badge="76 frameworks">
        <div className="mt-3 text-sm text-gray-600 space-y-3">
          <p>
            Video Style Frameworks are <strong>story structure templates</strong> that determine scene count,
            pacing, transitions, TTS mode, and overlays. They're separate from visual style presets —
            frameworks control <em>structure</em>, presets control <em>look</em>.
          </p>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm font-bold text-gray-900">16 Universal</p>
              <p className="text-xs text-gray-500">Work with any niche: Personal Journey, Origin Story, Top X Countdown, Myth Busting, etc.</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm font-bold text-gray-900">60 Niche-Specific</p>
              <p className="text-xs text-gray-500">3 per niche across 20 niches: AI Tech Demo, Horror Campfire, Crime Case File, etc.</p>
            </div>
          </div>

          <h4 className="font-semibold text-gray-900 mt-4">Two framework categories</h4>

          <div className="space-y-3 mt-2">
            <div className="border border-gray-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <BookOpen className="w-4 h-4 text-[#2C666E]" />
                <p className="font-semibold text-gray-900 text-sm">Story Frameworks (47)</p>
              </div>
              <p className="text-xs text-gray-500">
                Slower-paced, narrative-driven structures. Atmosphere, emotion, and pacing pills.
                Examples: Personal Journey, Origin Story, Mini Documentary, Horror Campfire, Crime Case File.
              </p>
            </div>
            <div className="border border-gray-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-[#2C666E]" />
                <p className="font-semibold text-gray-900 text-sm">Fast-Paced Frameworks (29)</p>
              </div>
              <p className="text-xs text-gray-500">
                Quick-cut, high-energy structures. Action, impact, and rhythm pills.
                Examples: Top X Countdown, Everything You Need to Know, Myth Busting, Did You Know.
              </p>
            </div>
          </div>

          <h4 className="font-semibold text-gray-900 mt-4">What frameworks control</h4>
          <ul className="space-y-1.5 mt-2">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
              <span><strong>Scene count per duration</strong> — how many scenes for 15s, 30s, 60s videos</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
              <span><strong>TTS mode</strong> — continuous narration vs. segmented voice, speed preferences</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
              <span><strong>Frame chaining</strong> — whether to use last-frame extraction for scene continuity</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
              <span><strong>Transitions</strong> — cut, dissolve, fade styles between scenes</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
              <span><strong>Overlays</strong> — text overlays, labels, countdown numbers</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
              <span><strong>Music & default presets</strong> — mood, visual style defaults</span>
            </li>
          </ul>

          <Tip>
            Frameworks are selected in the Shorts Workbench at Step 1 (Script & Voice). The framework + niche
            combination determines the script structure, scene count, and default visual mood. You can always
            override the visual style separately in Step 3.
          </Tip>

          <h4 className="font-semibold text-gray-900 mt-4">The 20 niches</h4>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {[
              'AI & Tech News', 'Finance & Money', 'Motivation & Self-Help', 'Scary & Horror',
              'History & Did You Know', 'True Crime', 'Science & Nature', 'Relationships & Dating',
              'Health & Fitness', 'Gaming & Pop Culture', 'Conspiracy & Mystery', 'Business & Entrepreneur',
              'Food & Cooking', 'Travel & Adventure', 'Psychology & Mind-Blown', 'Space & Cosmos',
              'Animals & Wildlife', 'Sports & Athletes', 'Education & Learning', 'Paranormal & UFO',
            ].map((n) => (
              <span key={n} className="px-2.5 py-1 bg-gray-100 rounded-full text-xs text-gray-600 font-medium">{n}</span>
            ))}
          </div>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* SECTION 5: PROMPT WRITING */}
      {/* ══════════════════════════════════════════════════════════════════ */}

      <Section icon={Wand2} title="Writing Effective Motion Prompts">
        <div className="mt-3 text-sm text-gray-600 space-y-3">
          <p>
            Motion prompts describe <strong>what happens in the video</strong> — the movement, camera work, and action.
            They're separate from style presets (which handle the look) and keyframe prompts (which handle the static image).
          </p>

          <h4 className="font-semibold text-gray-900 mt-4">The Golden Rule</h4>
          <div className="px-4 py-3 bg-[#2C666E]/5 border border-[#2C666E]/15 rounded-lg">
            <p className="text-sm text-[#07393C] font-medium">
              Describe MOVEMENT and ACTION, not scene appearance. The keyframe image already shows what the scene
              looks like — the motion prompt tells the AI what should <em>happen</em>.
            </p>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 border border-red-200 rounded-lg bg-red-50">
              <p className="text-xs font-bold text-red-700 uppercase mb-1.5 flex items-center gap-1">
                <XCircle className="w-3 h-3" /> Bad Prompts
              </p>
              <ul className="text-xs text-red-800 space-y-1.5">
                <li>"A woman standing in a kitchen" — describes a scene, not motion</li>
                <li>"Beautiful sunset over mountains" — static description</li>
                <li>"Product on a white background" — no movement described</li>
                <li>"Happy family at dinner table" — scene setup, not action</li>
              </ul>
            </div>
            <div className="p-3 border border-green-200 rounded-lg bg-green-50">
              <p className="text-xs font-bold text-green-700 uppercase mb-1.5 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Good Prompts
              </p>
              <ul className="text-xs text-green-800 space-y-1.5">
                <li>"Slow push forward, woman lifts mug and sips, steam rises"</li>
                <li>"Slow aerial pan left revealing the valley, clouds drift by"</li>
                <li>"Smooth 360 rotation, product spins on turntable, light shifts"</li>
                <li>"Camera slowly dollies in, family laughs, child reaches for food"</li>
              </ul>
            </div>
          </div>

          <h4 className="font-semibold text-gray-900 mt-5">Prompt structure for different models</h4>

          <div className="space-y-3 mt-2">
            <div className="border border-gray-200 rounded-lg p-3">
              <p className="font-semibold text-gray-900 text-sm mb-1">Kling (V3, O3, 2.0)</p>
              <p className="text-xs text-gray-500 mb-2">Optimal structure: Camera → Subject → Action → Environment → Lighting → Texture</p>
              <div className="px-3 py-2 bg-gray-50 rounded text-xs font-mono text-gray-700">
                "Slow dolly push forward, woman in blue dress turns toward camera, lifts hand in greeting, cozy living room with warm window light, soft ambient glow, natural skin texture"
              </div>
            </div>
            <div className="border border-gray-200 rounded-lg p-3">
              <p className="font-semibold text-gray-900 text-sm mb-1">Veo 3.1 / Veo 3.1 Lite</p>
              <p className="text-xs text-gray-500 mb-2">Prefers natural language with emotional tone emphasis. Describe the feeling.</p>
              <div className="px-3 py-2 bg-gray-50 rounded text-xs font-mono text-gray-700">
                "A gentle, intimate moment as the camera slowly pushes in. She looks up from her book with a warm smile, afternoon light casting long shadows across the desk."
              </div>
            </div>
            <div className="border border-gray-200 rounded-lg p-3">
              <p className="font-semibold text-gray-900 text-sm mb-1">Wan 2.5 / Wan Pro</p>
              <p className="text-xs text-gray-500 mb-2">Responds well to motion-first, physics-based descriptions.</p>
              <div className="px-3 py-2 bg-gray-50 rounded text-xs font-mono text-gray-700">
                "Smooth forward movement through the corridor, overhead lights flicker in sequence, subtle camera shake from footsteps, dust particles float in light beams"
              </div>
            </div>
          </div>

          <Warning>
            Never include brand names (Pixar, Disney, DreamWorks, etc.) in prompts — Veo 3.1 will reject them
            with a content policy error. The system automatically strips known brand names, but avoid them in
            manual prompt writing too.
          </Warning>

          <h4 className="font-semibold text-gray-900 mt-5">Camera movement vocabulary</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
            {[
              { term: 'Dolly in/out', desc: 'Camera moves toward/away from subject' },
              { term: 'Pan left/right', desc: 'Camera rotates horizontally' },
              { term: 'Tilt up/down', desc: 'Camera rotates vertically' },
              { term: 'Tracking shot', desc: 'Camera follows moving subject' },
              { term: 'Crane/jib', desc: 'Camera rises or descends vertically' },
              { term: 'Handheld', desc: 'Natural shake and breathing motion' },
              { term: 'Steadicam', desc: 'Smooth floating movement' },
              { term: 'Orbit/arc', desc: 'Camera circles the subject' },
              { term: 'Zoom in/out', desc: 'Focal length change (not physical move)' },
              { term: 'Dutch angle', desc: 'Tilted frame for tension' },
              { term: 'Rack focus', desc: 'Shift focus between near/far objects' },
              { term: 'Static', desc: 'Camera doesn\'t move (subject does)' },
            ].map((item) => (
              <div key={item.term} className="px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">
                <p className="text-xs font-semibold text-gray-900">{item.term}</p>
                <p className="text-[10px] text-gray-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* SECTION 6: PRODUCTION WORKFLOWS */}
      {/* ══════════════════════════════════════════════════════════════════ */}

      <Section icon={SlidersHorizontal} title="Production Workflows — Putting It All Together">
        <div className="mt-3 text-sm text-gray-600 space-y-3">

          <h4 className="font-semibold text-gray-900">Workflow 1: Standard Shorts (Most Common)</h4>
          <div className="mt-2 space-y-0">
            <Step number="1" title="Script & Voice (Step 1)">
              <p>Choose your niche, framework, and topic. Generate script with AI. Select voice and speed.</p>
            </Step>
            <Step number="2" title="Timing & Music (Step 2)">
              <p>Word-level timestamps via Whisper. Block alignment snaps scenes to model durations. Generate background music.</p>
            </Step>
            <Step number="3" title="Keyframes (Step 3)">
              <p>Choose visual style. Generate keyframe images for each scene. Use reference images for consistency. Edit prompts if needed.</p>
            </Step>
            <Step number="4" title="Video Clips (Step 4)">
              <p>Choose video model. Generate clips per scene (I2V or FLF auto-selected). Or enable Multi-Shot for Kling models.</p>
            </Step>
            <Step number="5" title="Assemble (Step 5)">
              <p>FFmpeg assembly: voiceover + music + captions + all clips into final video. Choose caption style. Download or publish.</p>
            </Step>
          </div>

          <Tip>
            For fastest iteration: use Wan 2.5 in Step 4 to test your prompts cheaply, then switch to Veo 3.1 or Kling V3
            for the final generation. You can regenerate individual scenes without redoing the whole video.
          </Tip>

          <h4 className="font-semibold text-gray-900 mt-6">Workflow 2: Character-Consistent Series</h4>
          <div className="mt-2 space-y-0">
            <Step number="1" title="Create Turnaround Sheet">
              <p>Use the Turnaround wizard with the R2V Reference pose set. Generate a 3x2 grid: 3 full-body + 3 portrait angles.</p>
            </Step>
            <Step number="2" title="Slice into Cells">
              <p>The Cell Editor auto-detects the grid. Select active cells for your character references.</p>
            </Step>
            <Step number="3" title="Generate R2V Video">
              <p>Click "Generate R2V Video" — cells auto-map to R2V elements. Opens JumpStart with Kling O3 R2V pre-loaded.</p>
            </Step>
            <Step number="4" title="Use in Shorts or Storyboards">
              <p>Save the R2V output to your library. Use as a reference in the Shorts Workbench or Storyboard production.</p>
            </Step>
          </div>

          <h4 className="font-semibold text-gray-900 mt-6">Workflow 3: Multi-Shot Narrative</h4>
          <div className="mt-2 space-y-0">
            <Step number="1" title="Write a Short with 3-6 Scenes">
              <p>Use the Shorts Workbench. Keep total duration under 15s for Multi-Shot mode.</p>
            </Step>
            <Step number="2" title="Select Kling V3 or O3">
              <p>Only these models support Multi-Shot. The toggle appears automatically in Step 4.</p>
            </Step>
            <Step number="3" title="Enable Multi-Shot Mode">
              <p>Check the Multi-Shot toggle. All scene prompts are collected into one API call.</p>
            </Step>
            <Step number="4" title="Generate">
              <p>One API call, one video. Kling handles scene transitions and character consistency across all shots.</p>
            </Step>
          </div>

          <h4 className="font-semibold text-gray-900 mt-6">Workflow 4: Storyboard Production</h4>
          <div className="mt-2 space-y-0">
            <Step number="1" title="Create & Configure Storyboard">
              <p>Set duration, visual style, mood, video model, brand kit, and characters in the Settings tab.</p>
            </Step>
            <Step number="2" title="Generate Script">
              <p>AI creates scenes with variable durations. Review and edit scene descriptions, lock scenes you like.</p>
            </Step>
            <Step number="3" title="Preview Images">
              <p>Generate preview images for each scene. Split, delete, or reorder scenes as needed.</p>
            </Step>
            <Step number="4" title="Production">
              <p>Generate video clips for all scenes. Choose I2V, FLF, R2V, or Motion Transfer strategy per scene.</p>
            </Step>
          </div>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* SECTION 7: AUDIO & CAPTIONS */}
      {/* ══════════════════════════════════════════════════════════════════ */}

      <Section icon={Volume2} title="Audio, Voiceover & Captions">
        <div className="mt-3 text-sm text-gray-600 space-y-3">

          <h4 className="font-semibold text-gray-900">Voiceover (TTS)</h4>
          <p>
            Stitch uses <strong>Gemini TTS</strong> (30 voices) as the default voiceover engine. Each voice has a
            personality profile. 12 featured voices are shown by default. Voice speed defaults to 1.15x and can be
            adjusted from 0.8x to 1.5x.
          </p>
          <ul className="space-y-1">
            <li className="flex items-start gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
              <span><strong>Voice Style Presets:</strong> Niche-specific + 8 universal styles (e.g., "Documentary Narrator", "Energetic Creator"). All use direct performance instructions.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
              <span><strong>Speed-Aware Pacing:</strong> At 1.15x+, the system injects pacing directives ("uptempo, crisp delivery") into the TTS instructions automatically.</span>
            </li>
          </ul>

          <h4 className="font-semibold text-gray-900 mt-4">Background Music</h4>
          <p>
            Generated via ElevenLabs Music through FAL.ai proxy. Always instrumental (no lyrics).
            Niche-aware mood selection — each niche template has a default <code>music_mood</code>.
            Music volume defaults to 15% in the final assembly.
          </p>

          <h4 className="font-semibold text-gray-900 mt-4">Captions</h4>
          <p>
            Burned directly into the video via <code>fal-ai/workflow-utilities/auto-subtitle</code>.
            Multiple caption styles available:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
            {['Word Pop', 'Karaoke Glow', 'Word Highlight', 'News Ticker'].map((s) => (
              <div key={s} className="px-3 py-2 bg-gray-50 rounded-lg text-center border border-gray-100">
                <p className="text-xs font-medium text-gray-700">{s}</p>
              </div>
            ))}
          </div>
          <p className="mt-2">
            Full caption config supports: font family, size, color, stroke, position, animation, background, and more.
          </p>

          <h4 className="font-semibold text-gray-900 mt-4">Model Audio Generation</h4>
          <p>Some video models can generate audio <em>within the video clip itself</em> (separate from voiceover/music):</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 text-xs">
              <Volume2 className="w-3.5 h-3.5 text-green-500" />
              <span>Kling V3, Kling O3, Veo 3.1, Veo 3.1 Lite, PixVerse V6, Grok</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <VolumeX className="w-3.5 h-3.5 text-red-400" />
              <span>Wan 2.5, Wan Pro, Kling 2.0, Hailuo, PixVerse v4.5, Wavespeed</span>
            </div>
          </div>
          <Warning>
            In Shorts Workbench, model audio is always forced OFF — the voiceover + music pipeline handles all audio.
            Only enable model audio in JumpStart or standalone video generation where you want ambient sound.
          </Warning>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* SECTION 8: DURATION & COST GUIDE */}
      {/* ══════════════════════════════════════════════════════════════════ */}

      <Section icon={Clock} title="Duration, Cost & Performance">
        <div className="mt-3 text-sm text-gray-600 space-y-3">

          <h4 className="font-semibold text-gray-900">Duration rules by model</h4>
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 pr-3 font-semibold text-gray-700">Model</th>
                  <th className="text-left py-2 pr-3 font-semibold text-gray-700">Accepted Durations</th>
                  <th className="text-left py-2 pr-3 font-semibold text-gray-700">Format</th>
                  <th className="text-left py-2 font-semibold text-gray-700">Cost Range</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr><td className="py-2 pr-3 font-medium">Veo 3.1 / Lite</td><td className="py-2 pr-3">4s, 6s, 8s ONLY</td><td className="py-2 pr-3">"4s" / "6s" / "8s"</td><td className="py-2">$0.10–0.40</td></tr>
                <tr><td className="py-2 pr-3 font-medium">Kling V3 / O3</td><td className="py-2 pr-3">5s, 10s</td><td className="py-2 pr-3">"5" / "10"</td><td className="py-2">$0.55–1.10</td></tr>
                <tr><td className="py-2 pr-3 font-medium">Kling 2.0</td><td className="py-2 pr-3">5s, 10s</td><td className="py-2 pr-3">"5" / "10"</td><td className="py-2">$0.25–0.50</td></tr>
                <tr><td className="py-2 pr-3 font-medium">Wan 2.5</td><td className="py-2 pr-3">3s, 5s</td><td className="py-2 pr-3">Integer</td><td className="py-2">$0.02–0.04</td></tr>
                <tr><td className="py-2 pr-3 font-medium">Grok I2V</td><td className="py-2 pr-3">1–10s</td><td className="py-2 pr-3">Integer</td><td className="py-2">$0.05–0.10</td></tr>
                <tr><td className="py-2 pr-3 font-medium">PixVerse V6</td><td className="py-2 pr-3">5s, 8s</td><td className="py-2 pr-3">Integer</td><td className="py-2">$0.06–0.10</td></tr>
                <tr><td className="py-2 pr-3 font-medium">Hailuo / Wan Pro</td><td className="py-2 pr-3">Fixed (~5-6s)</td><td className="py-2 pr-3">N/A</td><td className="py-2">$0.04–0.06</td></tr>
                <tr><td className="py-2 pr-3 font-medium">Wavespeed WAN</td><td className="py-2 pr-3">5s, 8s</td><td className="py-2 pr-3">Integer</td><td className="py-2">$0.02–0.03</td></tr>
              </tbody>
            </table>
          </div>

          <Warning>
            Veo 3.1 accepts ONLY "4s", "6s", or "8s" — any other value (including "5s" or "7s") causes a 422 error.
            The model registry handles this automatically, but be aware when estimating total video length.
          </Warning>

          <h4 className="font-semibold text-gray-900 mt-4">Cost optimization strategies</h4>
          <ul className="space-y-1.5 mt-2">
            <li className="flex items-start gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
              <span><strong>Test with Wan 2.5</strong> ($0.02/gen) — iterate on prompts and timing before switching to premium models</span>
            </li>
            <li className="flex items-start gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
              <span><strong>Use Veo 3.1 Lite</strong> instead of full Veo 3.1 — 60% cheaper with nearly identical quality for most content</span>
            </li>
            <li className="flex items-start gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
              <span><strong>Multi-Shot saves credits</strong> — 1 Kling call for 3-6 scenes vs. 3-6 individual calls</span>
            </li>
            <li className="flex items-start gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
              <span><strong>Shorter clips = better quality</strong> — 3-5s clips at higher quality beat 10s clips with wandering motion</span>
            </li>
            <li className="flex items-start gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
              <span><strong>Regenerate only failing scenes</strong> — the Shorts Workbench lets you redo individual clips without starting over</span>
            </li>
          </ul>

          <h4 className="font-semibold text-gray-900 mt-4">Processing time expectations</h4>
          <div className="grid grid-cols-3 gap-3 mt-2">
            <div className="p-3 bg-green-50 rounded-lg border border-green-200 text-center">
              <p className="text-lg font-bold text-green-700">15-30s</p>
              <p className="text-xs text-green-600">Wan 2.5, Wavespeed</p>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-center">
              <p className="text-lg font-bold text-amber-700">30-90s</p>
              <p className="text-xs text-amber-600">Veo, Hailuo, PixVerse</p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg border border-red-200 text-center">
              <p className="text-lg font-bold text-red-700">60-180s</p>
              <p className="text-xs text-red-600">Kling V3/O3, Multi-Shot</p>
            </div>
          </div>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* SECTION 9: TROUBLESHOOTING */}
      {/* ══════════════════════════════════════════════════════════════════ */}

      <Section icon={AlertTriangle} title="Troubleshooting & Common Issues">
        <div className="mt-3 text-sm text-gray-600 space-y-4">

          <TroubleshootItem
            problem="Veo 3.1 returns 422 'no_media_generated'"
            causes={[
              'Prompt contains brand names (Pixar, Disney, DreamWorks, etc.)',
              'R2V reference image has a white/blank background',
              'Duration value is not exactly 4s, 6s, or 8s',
            ]}
            fixes={[
              'Remove all brand names from prompts — use descriptive style terms instead',
              'For R2V references, use "Gray Background" or "Scene Environment" mode in Turnaround wizard',
              'Check duration — only "4s", "6s", "8s" are accepted',
            ]}
          />

          <TroubleshootItem
            problem="Video clips have jarring transitions between scenes"
            causes={[
              'Not using FLF mode (I2V doesn\'t guarantee smooth transitions)',
              'Keyframe images are too visually different between scenes',
              'Mixing video styles within a single video',
            ]}
            fixes={[
              'Use a FLF-capable model (Veo 3.1, Kling V3/O3) for smooth scene-to-scene continuity',
              'Ensure adjacent keyframes share visual elements — same character, similar lighting',
              'Or use Multi-Shot mode (Kling V3/O3) for model-managed transitions',
            ]}
          />

          <TroubleshootItem
            problem="Character looks different in each scene"
            causes={[
              'Standard I2V with no reference chaining',
              'Different keyframe prompts per scene producing inconsistent characters',
            ]}
            fixes={[
              'Use FLF mode — last frame of scene N becomes first frame of scene N+1',
              'Use Multi-Shot mode for Kling models — character consistency is built-in',
              'Use R2V with turnaround references for consistent character across separate videos',
              'Use I2I reference images in Step 3 — set a character reference for all scenes',
            ]}
          />

          <TroubleshootItem
            problem="Motion looks frozen or barely moves"
            causes={[
              'Motion prompt is too vague or describes a static scene',
              'Keyframe image is too complex for the model to animate',
            ]}
            fixes={[
              'Use specific motion verbs: "pushes forward", "turns head", "walks toward camera"',
              'Add camera movement: "slow dolly in", "gentle pan right", "orbit around subject"',
              'Simpler keyframe images animate better — reduce visual complexity',
            ]}
          />

          <TroubleshootItem
            problem="Video has unwanted audio / ambient sound"
            causes={[
              'Model audio generation is enabled',
              'Grok R2V defaults generate_audio to true if not explicitly disabled',
              'Veo 3.1 Lite also defaults audio to true',
            ]}
            fixes={[
              'In Shorts Workbench, audio is forced OFF automatically — this is expected',
              'In JumpStart, toggle the Audio switch OFF explicitly',
              'For Grok models, always send generate_audio: false unless you want ambient sound',
            ]}
          />

          <TroubleshootItem
            problem="Generation fails with 'Image too large' or upload errors"
            causes={[
              'Input image exceeds 10MB (FAL/Wavespeed limit)',
              'Image dimensions too large for the model',
            ]}
            fixes={[
              'The system auto-standardizes images before generation (downscale >9MB, upscale <1280px)',
              'If it still fails, manually resize your input image to under 5MB',
              'Use JPEG format for photos (smaller files) and PNG for illustrations (preserves quality)',
            ]}
          />

          <TroubleshootItem
            problem="FAL CDN URLs expired / broken thumbnails"
            causes={[
              'FAL CDN URLs (v3b.fal.media) are temporary — they expire within hours',
            ]}
            fixes={[
              'Generated media is auto-uploaded to Supabase storage via uploadUrlToSupabase()',
              'If you see broken images, the CDN URL expired before upload completed',
              'Save important outputs to your Library immediately after generation',
            ]}
          />

          <TroubleshootItem
            problem="Characters look different across scenes"
            causes={[
              'No character assigned — each scene generates independently',
              'Using I2V mode without frame chaining or reference images',
              'Character description is too vague for consistent reproduction',
            ]}
            fixes={[
              'Use CharacterPicker in Step 3 to assign the same character to all scenes',
              'Use FLF mode — the last frame carries appearance details to the next scene',
              'Use Multi-Shot mode (Kling V3/O3) for model-managed character consistency',
              'Add I2I reference images of the character in Step 3 for additional visual anchoring',
            ]}
          />

          <TroubleshootItem
            problem="Image generation prompt produces wrong style"
            causes={[
              'Confusing visual style (image) with video style preset (motion)',
              'Visual style override not applied — using niche default instead',
              'Prompt text is too short — under 40 words produces generic results',
            ]}
            fixes={[
              'Check that you selected the correct visual style in Step 3 (Keyframes), not the video style',
              'Visual style = what the IMAGE looks like. Video style = how the VIDEO moves. They are separate.',
              'If editing prompts manually, ensure they are 40-80 words with specific visual direction',
            ]}
          />

          <TroubleshootItem
            problem="Queue items stuck in 'scripting' status"
            causes={[
              'Autopilot worker encountered an error during script generation',
              'OpenAI API rate limit or timeout during narrative generation',
              'Queue item has invalid or missing niche/framework configuration',
            ]}
            fixes={[
              'Check the browser console for error messages from the autopilot worker',
              'Retry the stuck item manually by clicking the play button',
              'Verify the item has a valid niche and topic set in queue settings',
              'If persistent, delete the stuck item and re-add it',
            ]}
          />

          <TroubleshootItem
            problem="Repurposed landscape video has wrong framing"
            causes={[
              'Original vertical video letterboxed to 16:9 may crop important content',
              'Text overlays and captions positioned for vertical may be misplaced in landscape',
            ]}
            fixes={[
              'Landscape repurposing adds letterbox bars — ensure key content is centered in frame',
              'Review the landscape version and adjust if the primary subject is cut off',
              'Consider generating a separate landscape version with different keyframe framing',
            ]}
          />

          <TroubleshootItem
            problem="Camera control not affecting video output"
            causes={[
              'Camera config only overrides the motion prompt — it does not change the keyframe image',
              'Camera angle (e.g., low angle) conflicts with the keyframe perspective (e.g., eye level)',
              'The video model may not fully interpret complex multi-layer camera instructions',
            ]}
            fixes={[
              'Ensure your keyframe image perspective matches the camera angle setting',
              'Use camera presets for more reliable results — they are tested combinations',
              'Simplify camera config — one strong movement direction is better than combining all four layers',
              'Some budget models (Wan 2.5, Wavespeed) have limited camera direction adherence — use premium models for precise control',
            ]}
          />
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* SECTION 10: GLOSSARY */}
      {/* ══════════════════════════════════════════════════════════════════ */}

      <Section icon={BookOpen} title="Glossary">
        <div className="mt-3 text-sm text-gray-600">
          <div className="grid grid-cols-1 gap-2">
            {[
              { term: 'I2V', def: 'Image-to-Video — animate a still image into a video clip' },
              { term: 'FLF', def: 'First-Last-Frame — provide start and end frames, AI generates the transition between them' },
              { term: 'R2V', def: 'Reference-to-Video — use character reference images to generate video featuring that character' },
              { term: 'Multi-Shot', def: 'Send multiple scene prompts in one API call, model generates a continuous multi-scene video' },
              { term: 'Motion Transfer', def: 'Extract motion from a reference video and apply it to a still character image' },
              { term: 'Keyframe', def: 'A still image that defines what a scene looks like — the visual starting point for video generation' },
              { term: 'Motion Prompt', def: 'Text describing what should HAPPEN in the video (movement, camera work, actions)' },
              { term: 'Video Style Preset', def: 'A ~100-word prompt controlling cinematography, lighting, color grade, and motion feel' },
              { term: 'Framework', def: 'A structural template defining scene count, pacing, TTS mode, and transitions for a video type' },
              { term: 'Frame Chaining', def: 'Extracting the last frame of scene N to use as the first frame of scene N+1 for continuity' },
              { term: 'Duration Solver', def: 'Algorithm that optimizes per-scene durations to fit model-accepted duration values' },
              { term: 'Block Aligner', def: 'Snaps scene durations to the nearest accepted model duration (e.g., 5s → 4s or 6s for Veo)' },
              { term: 'Turnaround Sheet', def: 'Multi-pose character reference sheet generated from a single character description' },
              { term: 'Elements', def: 'In Kling R2V, named character references (@Element1) with frontal + reference images' },
              { term: 'TTS', def: 'Text-to-Speech — converts script text into voiceover audio (Gemini TTS or ElevenLabs)' },
              { term: 'Caption Burn', def: 'Embedding word-level captions directly into the video using auto-subtitle' },
              { term: 'Assembly', def: 'FFmpeg composition combining video clips, voiceover, music, and captions into the final output' },
              { term: 'Camera Config', def: 'Structured per-scene camera direction: movement + speed + angle + framing. Overrides video style motion.' },
              { term: 'Character Cameo', def: 'A character assigned to a scene via CharacterPicker — description auto-injected into keyframe prompt' },
              { term: 'Production Queue', def: 'Batch processing system at /queue for producing multiple Shorts with configurable settings' },
              { term: 'Autopilot', def: 'Hands-free queue processing mode — the worker automatically scripts, generates, and assembles each item' },
              { term: 'Repurpose', def: 'Generate platform-specific metadata and format variants (YouTube, TikTok, IG, Landscape) from a finished Short' },
              { term: 'Ad Clone', def: 'Analyze a competitor video ad and extract a "clone recipe" — hook, structure, style, CTA — for adaptation' },
              { term: 'Visual Style (Image)', def: 'Controls keyframe image aesthetics (14 Shorts styles, 123 StyleGrid presets). Separate from video style.' },
              { term: 'Video Style Preset', def: 'Controls video motion, cinematography, and feel (86 presets in 6 categories). Applied during video generation.' },
              { term: 'Niche', def: 'One of 20 content categories (AI/Tech, Horror, Finance, etc.) with dedicated templates, voice defaults, and visual moods' },
              { term: 'Topic Funnel', def: '3-level progressive topic selector per niche: Category > Angle > Hook. Narrows broad niches to specific video topics.' },
              { term: 'Scene Pills', def: 'Context-aware visual direction helpers shown in the script step. Curated by niche, framework, and duration.' },
              { term: 'Brand Kit', def: 'Logo, colors, fonts, guidelines, and voice configuration saved for consistent branded content across all tools' },
              { term: 'LoRA', def: 'Low-Rank Adaptation — fine-tuned model weights trained on your images for pixel-level character/style consistency' },
            ].map((item) => (
              <div key={item.term} className="flex gap-3 py-2 border-b border-gray-100 last:border-0">
                <span className="font-mono text-xs font-bold text-[#2C666E] shrink-0 w-32">{item.term}</span>
                <span className="text-xs text-gray-600">{item.def}</span>
              </div>
            ))}
          </div>
        </div>
      </Section>
    </div>
  );
}

// ── Interactive Style Decision Guide ─────────────────────────────────────────

const STYLE_QUESTIONS = [
  {
    id: 'content',
    question: 'What are you making?',
    options: [
      { key: 'social_ad', label: 'Social Ad', icon: Megaphone },
      { key: 'brand_film', label: 'Brand Film', icon: Film },
      { key: 'faceless', label: 'Faceless Channel', icon: Eye },
      { key: 'kids', label: 'Kids Content', icon: Baby },
      { key: 'educational', label: 'Educational', icon: GraduationCap },
      { key: 'product_demo', label: 'Product Demo', icon: Package },
      { key: 'artistic', label: 'Artistic / Creative', icon: Brush },
    ],
  },
  {
    id: 'audience',
    question: 'Who is your audience?',
    options: [
      { key: 'gen_z', label: 'Gen Z (TikTok native)' },
      { key: 'millennial', label: 'Millennials (IG/YT)' },
      { key: 'professional', label: 'Professionals (LinkedIn)' },
      { key: 'parents', label: 'Parents / Families' },
      { key: 'general', label: 'General / Mass Market' },
    ],
  },
  {
    id: 'feeling',
    question: 'What feeling should it evoke?',
    options: [
      { key: 'trust', label: 'Trust & Credibility' },
      { key: 'excitement', label: 'Excitement & Energy' },
      { key: 'warmth', label: 'Warmth & Comfort' },
      { key: 'awe', label: 'Awe & Wonder' },
      { key: 'urgency', label: 'Urgency & Action' },
      { key: 'calm', label: 'Calm & Relaxation' },
    ],
  },
  {
    id: 'budget',
    question: 'What is your budget priority?',
    options: [
      { key: 'premium', label: 'Premium (Best Quality)' },
      { key: 'balanced', label: 'Balanced (Good Value)' },
      { key: 'budget', label: 'Budget (Lowest Cost)' },
    ],
  },
];

const STYLE_RECIPES = {
  social_ad: {
    label: 'Social Ad',
    recommendations: {
      premium: { videoStyle: 'TikTok/Reels Style or UGC Testimonial', visualStyle: 'Modern & Clean', framework: 'Hook-Problem-Solution', model: 'Veo 3.1', camera: 'Documentary or Intimate' },
      balanced: { videoStyle: 'Commercial/Ad or Lifestyle Ad', visualStyle: 'Bright & Vibrant', framework: 'Hook-Problem-Solution', model: 'Veo 3.1 Lite', camera: 'Hero Reveal or Establishing Pan' },
      budget: { videoStyle: 'UGC Testimonial', visualStyle: 'Natural & Organic', framework: 'Quick Tip', model: 'Wan 2.5', camera: 'Documentary' },
    },
  },
  brand_film: {
    label: 'Brand Film',
    recommendations: {
      premium: { videoStyle: 'Cinematic or Anamorphic Widescreen', visualStyle: 'Cinematic Film', framework: 'Personal Journey or Origin Story', model: 'Veo 3.1', camera: 'Epic Crane or Hero Reveal' },
      balanced: { videoStyle: 'Golden Hour Cinematic', visualStyle: 'Warm & Golden', framework: 'Personal Journey', model: 'Kling V3 Pro (Multi-Shot)', camera: 'Establishing Pan' },
      budget: { videoStyle: 'Commercial/Ad', visualStyle: 'Professional Clean', framework: 'Personal Journey', model: 'Veo 3.1 Lite', camera: 'Pullback Reveal' },
    },
  },
  faceless: {
    label: 'Faceless Channel',
    recommendations: {
      premium: { videoStyle: 'Faceless Cinematic or Faceless Tech', visualStyle: 'Dramatic & Moody', framework: 'Top X Countdown or Did You Know', model: 'Veo 3.1', camera: 'Establishing Pan or God View' },
      balanced: { videoStyle: 'Faceless Nature or Faceless Dark', visualStyle: 'Atmospheric', framework: 'Everything You Need to Know', model: 'Veo 3.1 Lite', camera: 'Tilt Reveal' },
      budget: { videoStyle: 'Stock B-Roll', visualStyle: 'Clean & Simple', framework: 'Top X Countdown', model: 'Wan 2.5', camera: 'Static or Establishing Pan' },
    },
  },
  kids: {
    label: 'Kids Content',
    recommendations: {
      premium: { videoStyle: 'Kids 3D Animation or Kids Cartoon', visualStyle: '3D Animated', framework: 'Kids Story or Fairy Tale', model: 'Veo 3.1', camera: 'Establishing Pan or Orbit Reveal' },
      balanced: { videoStyle: 'Kids Storybook or Kids Watercolor', visualStyle: 'Soft Illustration', framework: 'Kids Story', model: 'Veo 3.1 Lite', camera: 'Pullback Reveal' },
      budget: { videoStyle: 'Flat Vector Kids', visualStyle: 'Flat & Colorful', framework: 'Kids Educational', model: 'Wan 2.5', camera: 'Static' },
    },
  },
  educational: {
    label: 'Educational',
    recommendations: {
      premium: { videoStyle: 'Documentary or Whiteboard Explainer', visualStyle: 'Clean & Informative', framework: 'Mini Documentary or Myth Busting', model: 'Veo 3.1', camera: 'Documentary or Detail Inspect' },
      balanced: { videoStyle: 'Motion Graphics or Corporate Training', visualStyle: 'Infographic', framework: 'Everything You Need to Know', model: 'Veo 3.1 Lite', camera: 'Establishing Pan' },
      budget: { videoStyle: 'Whiteboard Explainer', visualStyle: 'Clean & Minimal', framework: 'Quick Tip', model: 'Wan 2.5', camera: 'Static' },
    },
  },
  product_demo: {
    label: 'Product Demo',
    recommendations: {
      premium: { videoStyle: 'Product Demo or Luxury Brand Ad', visualStyle: 'Studio Lit', framework: 'Product Showcase', model: 'Veo 3.1', camera: 'Orbit Reveal or Detail Inspect' },
      balanced: { videoStyle: 'Product Demo Hands-On', visualStyle: 'Natural Light', framework: 'Product Showcase', model: 'Veo 3.1 Lite', camera: 'Hero Reveal' },
      budget: { videoStyle: 'Product Demo 360', visualStyle: 'Clean White', framework: 'Quick Tip', model: 'Wan 2.5', camera: 'Orbit Reveal' },
    },
  },
  artistic: {
    label: 'Artistic / Creative',
    recommendations: {
      premium: { videoStyle: 'Dreamy/Ethereal or Cyberpunk Neon', visualStyle: 'Artistic & Experimental', framework: 'Personal Journey or Visual Poem', model: 'Veo 3.1', camera: 'Descending or Tilt Reveal' },
      balanced: { videoStyle: 'Vintage/Retro or Film Noir', visualStyle: 'Retro Film', framework: 'Personal Journey', model: 'Kling V3 Pro', camera: 'Tension or Intimate' },
      budget: { videoStyle: 'Stop Motion or Watercolor Painterly', visualStyle: 'Handcrafted', framework: 'Personal Journey', model: 'Wan 2.5', camera: 'Detail Inspect' },
    },
  },
};

function StyleDecisionGuide() {
  const [answers, setAnswers] = useState({});
  const [step, setStep] = useState(0);

  const currentQ = STYLE_QUESTIONS[step];
  const allAnswered = Object.keys(answers).length === STYLE_QUESTIONS.length;
  const recipe = allAnswered
    ? STYLE_RECIPES[answers.content]?.recommendations?.[answers.budget]
    : null;

  const handleSelect = (questionId, key) => {
    setAnswers((prev) => ({ ...prev, [questionId]: key }));
    if (step < STYLE_QUESTIONS.length - 1) {
      setTimeout(() => setStep(step + 1), 200);
    }
  };

  const reset = () => { setAnswers({}); setStep(0); };

  return (
    <Section icon={Compass} title="Interactive Style Decision Guide" badge="INTERACTIVE">
      <div className="mt-3 text-sm text-gray-600 space-y-4">
        <p>
          Not sure which styles and settings to use? Answer these questions and get a tailored recommendation.
        </p>

        {/* Progress */}
        <div className="flex gap-1">
          {STYLE_QUESTIONS.map((q, i) => (
            <div
              key={q.id}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                answers[q.id] ? 'bg-[#2C666E]' : i === step ? 'bg-[#2C666E]/40' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>

        {/* Questions */}
        {!allAnswered && currentQ && (
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">{currentQ.question}</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {currentQ.options.map((opt) => {
                const isSelected = answers[currentQ.id] === opt.key;
                return (
                  <button
                    key={opt.key}
                    onClick={() => handleSelect(currentQ.id, opt.key)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      isSelected
                        ? 'border-[#2C666E] bg-[#2C666E]/5 ring-1 ring-[#2C666E]'
                        : 'border-gray-200 hover:border-[#2C666E]/40 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {opt.icon && <opt.icon className="w-4 h-4 text-[#2C666E]" />}
                      <span className="text-sm font-medium text-gray-900">{opt.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Navigation */}
            <div className="flex gap-2 mt-3">
              {step > 0 && (
                <button
                  onClick={() => setStep(step - 1)}
                  className="px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  Back
                </button>
              )}
            </div>
          </div>
        )}

        {/* Results */}
        {allAnswered && recipe && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-900">Your Recommended Recipe</h4>
              <button onClick={reset} className="text-xs text-[#2C666E] hover:underline flex items-center gap-1">
                <RotateCcw className="w-3 h-3" /> Start Over
              </button>
            </div>

            <div className="bg-gradient-to-br from-[#2C666E]/5 to-[#2C666E]/10 border border-[#2C666E]/20 rounded-xl p-5 space-y-3">
              <div className="text-center mb-4">
                <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#2C666E] text-white rounded-full text-xs font-bold">
                  {STYLE_RECIPES[answers.content]?.label} — {answers.budget === 'premium' ? 'Premium' : answers.budget === 'balanced' ? 'Balanced' : 'Budget'}
                </span>
              </div>
              {[
                { label: 'Video Style Preset', value: recipe.videoStyle },
                { label: 'Visual Style', value: recipe.visualStyle },
                { label: 'Framework', value: recipe.framework },
                { label: 'Video Model', value: recipe.model },
                { label: 'Camera Preset', value: recipe.camera },
              ].map((r) => (
                <div key={r.label} className="flex items-center justify-between py-2 border-b border-[#2C666E]/10 last:border-0">
                  <span className="text-xs font-semibold text-gray-500 uppercase">{r.label}</span>
                  <span className="text-sm font-medium text-gray-900">{r.value}</span>
                </div>
              ))}
            </div>

            <Tip>
              These are starting points. Once you're familiar with the style systems, feel free to mix and match.
              The best content often comes from unexpected combinations.
            </Tip>
          </div>
        )}
      </div>
    </Section>
  );
}

// ── Niche Mastery Guide ─────────────────────────────────────────────────────

const NICHE_GUIDE_DATA = {
  entertainment: {
    label: 'Entertainment',
    icon: Skull,
    niches: [
      {
        key: 'scary_horror', label: 'Horror', icon: Ghost,
        frameworks: 'Horror Campfire, Personal Journey, Mystery Countdown',
        visualStyle: 'Faceless Dark, Film Noir, Neo-Noir',
        videoStyle: 'Noir Detective, Night Cinematic, Faceless Dark',
        topics: 'Unexplained disappearances, haunted locations, paranormal encounters, urban legends',
        hooks: '"What happened at 3AM in this abandoned hospital will haunt you..." / "The sounds they recorded were never explained..."',
        voice: 'Kore (deep, atmospheric) or Orus (gravelly authority)',
        camera: 'Tension, Surveillance, Detail Inspect, Descending',
        mistakes: 'Avoid bright lighting in keyframes. Don\'t use upbeat music moods. Keep pacing deliberate — horror needs slow builds, not rapid cuts.',
      },
      {
        key: 'true_crime', label: 'True Crime', icon: Target,
        frameworks: 'Crime Case File, Mini Documentary, Top X Countdown',
        visualStyle: 'Documentary, Film Noir, Faceless Dark',
        videoStyle: 'Documentary, Sit-Down Interview, Street Urban Doc',
        topics: 'Unsolved cases, criminal psychology, forensic breakthroughs, trial analysis',
        hooks: '"In 1987, a woman vanished from her locked apartment. The door was bolted from inside..." / "The DNA evidence pointed to someone who had been dead for 10 years..."',
        voice: 'Puck (measured authority) or Kore (deep seriousness)',
        camera: 'Documentary, Tension, Pullback Reveal, Surveillance',
        mistakes: 'Avoid sensationalism in visuals. Use muted, desaturated color palettes. Don\'t rush the narrative — true crime audiences want detail.',
      },
      {
        key: 'gaming_popculture', label: 'Gaming & Pop Culture', icon: Gamepad2,
        frameworks: 'Top X Countdown, Did You Know, Everything You Need to Know',
        visualStyle: 'Cyberpunk Neon, Anime, Faceless Tech',
        videoStyle: 'TikTok/Reels Style, Cyberpunk Neon, Fast-Paced Dynamic',
        topics: 'Easter eggs, game lore deep dives, speedrun records, industry drama, hidden mechanics',
        hooks: '"99% of players never found this secret room..." / "This one glitch changed competitive gaming forever..."',
        voice: 'Charon (energetic) or Fenrir (bold authority)',
        camera: 'Dramatic Zoom, Whip Transition, Tracking Chase',
        mistakes: 'Don\'t use slow pacing — gaming audiences expect energy. Match the game\'s visual aesthetic in your style choice.',
      },
      {
        key: 'conspiracy_mystery', label: 'Conspiracy & Mystery', icon: Eye,
        frameworks: 'Myth Busting, Mystery Countdown, Mini Documentary',
        visualStyle: 'Film Noir, Faceless Dark, Documentary',
        videoStyle: 'Noir Detective, Night Cinematic, Documentary',
        topics: 'Government secrets, archaeological anomalies, lost civilizations, unexplained phenomena',
        hooks: '"This document was classified for 50 years. Here\'s what it says..." / "Scientists can\'t explain why this structure exists..."',
        voice: 'Kore (deep mystery) or Puck (authoritative reveal)',
        camera: 'Tension, Detail Inspect, Descending, Surveillance',
        mistakes: 'Balance intrigue with credibility. Avoid making definitive claims — present evidence and let the viewer decide.',
      },
      {
        key: 'paranormal_ufo', label: 'Paranormal & UFO', icon: Telescope,
        frameworks: 'Horror Campfire, Mystery Countdown, Top X Countdown',
        visualStyle: 'Faceless Dark, Film Noir, Dreamy Ethereal',
        videoStyle: 'Night Cinematic, Noir Silhouette, Faceless Dark',
        topics: 'UAP sightings, government disclosure, haunted locations, cryptids, near-death experiences',
        hooks: '"The Pentagon just released footage they said didn\'t exist..." / "Every person who entered this room reported the same thing..."',
        voice: 'Kore (otherworldly depth) or Orus (gravelly witness)',
        camera: 'God View, Tension, Tilt Reveal, Surveillance',
        mistakes: 'Don\'t overuse sci-fi aesthetics — grounded, documentary-style visuals are more convincing. Use night/dark scenes judiciously.',
      },
    ],
  },
  knowledge: {
    label: 'Knowledge',
    icon: Brain,
    niches: [
      {
        key: 'ai_tech_news', label: 'AI & Tech News', icon: Cpu,
        frameworks: 'Everything You Need to Know, Top X Countdown, Quick Explainer',
        visualStyle: 'Faceless Tech, Cyberpunk Neon, Motion Graphics',
        videoStyle: 'Faceless Tech, Motion Graphics, Fast-Paced Dynamic',
        topics: 'New model releases, industry shifts, tool comparisons, future predictions, regulation',
        hooks: '"This AI just made a $100B company obsolete..." / "OpenAI quietly released something that changes everything..."',
        voice: 'Charon (energetic tech) or Puck (authoritative explainer)',
        camera: 'Dramatic Zoom, Establishing Pan, Detail Inspect',
        mistakes: 'Avoid outdated visuals (robots, blue circuits). Use modern tech aesthetics. Keep scripts factual — tech audiences fact-check.',
      },
      {
        key: 'science_nature', label: 'Science & Nature', icon: FlaskConical,
        frameworks: 'Mini Documentary, Did You Know, Myth Busting',
        visualStyle: 'Nature Documentary, Documentary, Faceless Nature',
        videoStyle: 'Nature Documentary, Documentary, Faceless Nature',
        topics: 'Evolutionary biology, quantum physics simplified, animal behavior, climate phenomena',
        hooks: '"This creature has survived 5 mass extinctions. Here\'s its secret..." / "Physics says this should be impossible. But it happens every day..."',
        voice: 'Puck (warm authority) or Aoede (wonder and curiosity)',
        camera: 'Epic Crane, Detail Inspect, God View, Tilt Reveal',
        mistakes: 'Don\'t oversimplify to the point of inaccuracy. Use high-quality nature imagery. Match pacing to the content — some science topics need breathing room.',
      },
      {
        key: 'history_did_you_know', label: 'History', icon: BookOpen,
        frameworks: 'Did You Know, Mini Documentary, Personal Journey',
        visualStyle: 'Vintage/Retro, Documentary, Film Noir',
        videoStyle: 'Vintage/Retro, Documentary, 70s Film',
        topics: 'Forgotten events, historical "what ifs", fascinating individuals, ancient mysteries',
        hooks: '"In 1945, a single decision by a junior officer prevented nuclear war..." / "This woman changed history. You\'ve never heard her name..."',
        voice: 'Puck (storyteller) or Orus (gravelly narrator)',
        camera: 'Establishing Pan, Pullback Reveal, Detail Inspect',
        mistakes: 'Avoid anachronistic imagery. Use period-appropriate visual styles. Don\'t compress timelines too aggressively — let key moments breathe.',
      },
      {
        key: 'education_learning', label: 'Education & Learning', icon: GraduationCap,
        frameworks: 'Quick Explainer, Step-by-Step, Myth Busting',
        visualStyle: 'Whiteboard Explainer, Motion Graphics, Corporate Training',
        videoStyle: 'Whiteboard Explainer, Motion Graphics, Documentary',
        topics: 'Study techniques, career skills, language learning, mental models, productivity systems',
        hooks: '"The smartest students don\'t study harder. They do this instead..." / "This learning technique is backed by 40 years of research..."',
        voice: 'Puck (clear educator) or Aoede (engaging teacher)',
        camera: 'Documentary, Detail Inspect, Static',
        mistakes: 'Don\'t cram too much content into one video. Focus on one concept per Short. Use visual aids — plain talking heads underperform.',
      },
      {
        key: 'psychology_mind', label: 'Psychology & Mind', icon: Brain,
        frameworks: 'Did You Know, Personal Journey, Myth Busting',
        visualStyle: 'Dreamy Ethereal, Documentary, Faceless Abstract',
        videoStyle: 'Dreamy/Ethereal, Documentary, Faceless Abstract',
        topics: 'Cognitive biases, body language, persuasion, habit formation, emotional intelligence',
        hooks: '"Your brain does this 200 times a day without you knowing..." / "The reason you can\'t stop scrolling is a trick from 1950s casinos..."',
        voice: 'Aoede (thoughtful) or Puck (authoritative psychology)',
        camera: 'Intimate, Detail Inspect, Descending',
        mistakes: 'Avoid pop-psychology oversimplifications. Cite research when possible. Use introspective, thoughtful pacing — not rapid-fire.',
      },
      {
        key: 'space_cosmos', label: 'Space & Cosmos', icon: Telescope,
        frameworks: 'Did You Know, Top X Countdown, Mini Documentary',
        visualStyle: 'Faceless Nature (space variant), Cyberpunk Neon, Fantasy Epic',
        videoStyle: 'Faceless Cinematic, Fantasy Epic, Faceless Nature',
        topics: 'Exoplanets, black holes, Mars colonization, deep space signals, telescope discoveries',
        hooks: '"James Webb just found something 13 billion light-years away that shouldn\'t exist..." / "If you could stand on this planet, you\'d see 3 sunsets..."',
        voice: 'Kore (cosmic wonder) or Puck (science authority)',
        camera: 'God View, Tilt Reveal, Epic Crane, Establishing Pan',
        mistakes: 'Don\'t use Earth-based scenery for space content. Go big on scale and wonder. Space audiences love awe — deliver it visually.',
      },
    ],
  },
  lifestyle: {
    label: 'Lifestyle',
    icon: Heart,
    niches: [
      {
        key: 'finance_money', label: 'Finance & Money', icon: DollarSign,
        frameworks: 'Top X Countdown, Quick Tip, Myth Busting',
        visualStyle: 'Motion Graphics, Commercial/Ad, Faceless Luxury',
        videoStyle: 'Commercial/Ad, Motion Graphics, Faceless Luxury',
        topics: 'Investing strategies, tax optimization, financial independence, market analysis, side hustles',
        hooks: '"Millionaires do this with their first $1,000. Most people don\'t..." / "This tax loophole saves the average person $3,400/year..."',
        voice: 'Fenrir (confident authority) or Charon (energetic finance)',
        camera: 'Hero Reveal, Dramatic Zoom, Detail Inspect',
        mistakes: 'Avoid get-rich-quick vibes. Use professional, clean visuals. Finance audiences value credibility — flashy styles backfire.',
      },
      {
        key: 'motivation_self_help', label: 'Motivation', icon: Flame,
        frameworks: 'Personal Journey, Quick Tip, Transformation',
        visualStyle: 'Golden Hour Cinematic, Dreamy Ethereal, Commercial Lifestyle',
        videoStyle: 'Golden Hour Cinematic, Cinematic, Commercial Lifestyle',
        topics: 'Morning routines, mindset shifts, discipline frameworks, overcoming adversity, goal setting',
        hooks: '"The 5-second rule changed everything for me..." / "I wasted 10 years before learning this one principle..."',
        voice: 'Fenrir (bold inspiration) or Charon (warm energy)',
        camera: 'Hero Reveal, Epic Crane, Tilt Reveal',
        mistakes: 'Avoid cliches and generic advice. Specificity wins. Use warm, aspirational lighting — avoid dark or cold aesthetics.',
      },
      {
        key: 'relationships_dating', label: 'Relationships', icon: Heart,
        frameworks: 'Personal Journey, Did You Know, Quick Tip',
        visualStyle: 'Golden Hour Cinematic, Dreamy Ethereal, UGC Storytime',
        videoStyle: 'Dreamy/Ethereal, UGC Storytime, Commercial Lifestyle',
        topics: 'Communication patterns, attachment styles, red flags, dating psychology, conflict resolution',
        hooks: '"If your partner does this, it\'s not what you think..." / "Psychologists call this the #1 predictor of divorce..."',
        voice: 'Aoede (empathetic) or Leda (warm conversational)',
        camera: 'Intimate, Documentary, Descending',
        mistakes: 'Avoid sensationalism about relationships. Use warm, inviting visuals. Pacing should be conversational, not rapid-fire.',
      },
      {
        key: 'health_fitness', label: 'Fitness & Health', icon: Dumbbell,
        frameworks: 'Quick Tip, Myth Busting, Before & After',
        visualStyle: 'Commercial Lifestyle, UGC Testimonial, Documentary',
        videoStyle: 'Commercial Lifestyle, UGC Before After, Fast-Paced Dynamic',
        topics: 'Exercise form guides, nutrition myths, recovery science, supplement analysis, training programs',
        hooks: '"This one exercise replaces 30 minutes of cardio..." / "Everything you know about protein timing is wrong..."',
        voice: 'Fenrir (energetic coach) or Charon (dynamic energy)',
        camera: 'Tracking Chase, Hero Reveal, Detail Inspect',
        mistakes: 'Avoid unrealistic transformation claims. Use high-energy visuals and pacing. Show movement in keyframes — static gym shots underperform.',
      },
      {
        key: 'food_cooking', label: 'Food & Cooking', icon: Utensils,
        frameworks: 'Quick Tip, Step-by-Step, Top X Countdown',
        visualStyle: 'Faceless Food, Commercial Lifestyle, UGC Unboxing',
        videoStyle: 'Faceless Food, UGC Unboxing, Commercial Lifestyle',
        topics: 'Quick recipes, kitchen hacks, restaurant secrets, ingredient deep dives, food science',
        hooks: '"This 3-ingredient sauce will change every meal you make..." / "Chefs have been hiding this technique for decades..."',
        voice: 'Leda (warm, inviting) or Aoede (curious foodie)',
        camera: 'Detail Inspect, Orbit Reveal, Documentary',
        mistakes: 'Overhead and macro shots are essential. Use warm, golden lighting. Never use cold or clinical visual styles for food content.',
      },
      {
        key: 'travel_adventure', label: 'Travel & Adventure', icon: MapPin,
        frameworks: 'Top X Countdown, Mini Documentary, Personal Journey',
        visualStyle: 'Faceless Travel, Golden Hour Cinematic, Nature Documentary',
        videoStyle: 'Faceless Travel, Golden Hour Cinematic, Nature Documentary',
        topics: 'Hidden destinations, budget travel hacks, cultural experiences, extreme adventures, road trips',
        hooks: '"This island costs $12/day and looks like paradise..." / "I found a village that time forgot. Here\'s what I saw..."',
        voice: 'Charon (adventurous energy) or Aoede (wanderlust)',
        camera: 'Epic Crane, Establishing Pan, God View, Tilt Reveal',
        mistakes: 'Use wide, cinematic shots — close-ups alone don\'t convey the destination. Golden hour lighting is your best friend. Don\'t skip establishing shots.',
      },
      {
        key: 'business_entrepreneur', label: 'Business', icon: Briefcase,
        frameworks: 'Personal Journey, Quick Tip, Case Study',
        visualStyle: 'Commercial/Ad, Corporate Training, Motion Graphics',
        videoStyle: 'Commercial/Ad, Corporate Training, Documentary Interview',
        topics: 'Startup lessons, scaling strategies, management frameworks, negotiation, market analysis',
        hooks: '"This $0 marketing strategy grew my business 10x..." / "Every successful CEO does this one thing differently..."',
        voice: 'Fenrir (confident leader) or Puck (strategic authority)',
        camera: 'Hero Reveal, Documentary, Pullback Reveal',
        mistakes: 'Avoid corporate blandness. Use confident, premium visuals. Business audiences value substance — don\'t sacrifice depth for brevity.',
      },
    ],
  },
  creative: {
    label: 'Creative',
    icon: PawPrint,
    niches: [
      {
        key: 'animals_wildlife', label: 'Animals & Wildlife', icon: PawPrint,
        frameworks: 'Did You Know, Top X Countdown, Mini Documentary',
        visualStyle: 'Nature Documentary, Faceless Nature, Kids Cartoon (for cute animals)',
        videoStyle: 'Nature Documentary, Faceless Nature, Documentary',
        topics: 'Animal intelligence, unusual species, rescue stories, wildlife behavior, pet science',
        hooks: '"This animal can do something no other creature on Earth can..." / "Scientists just discovered why cats do this..."',
        voice: 'Aoede (warm narrator) or Puck (nature documentary)',
        camera: 'Detail Inspect, Establishing Pan, Tracking Chase',
        mistakes: 'Use close-up macro shots for small animals, wide shots for landscapes. Match pacing to the animal — slow for majestic, fast for playful.',
      },
      {
        key: 'sports_athletes', label: 'Sports & Athletes', icon: Trophy,
        frameworks: 'Top X Countdown, Personal Journey, Everything You Need to Know',
        visualStyle: 'Fast-Paced Dynamic, Commercial/Ad, Documentary',
        videoStyle: 'Fast-Paced Dynamic, Commercial/Ad, Documentary',
        topics: 'Legendary moments, training secrets, underdog stories, record analysis, strategy breakdowns',
        hooks: '"In the final 3 seconds, he did something no one has done before or since..." / "This athlete trains 6 hours a day. Here\'s the one exercise that matters most..."',
        voice: 'Fenrir (high energy) or Charon (dynamic storytelling)',
        camera: 'Tracking Chase, Dramatic Zoom, Whip Transition, Hero Reveal',
        mistakes: 'Don\'t use slow pacing for sports — energy is everything. Quick cuts, dynamic camera work, and bold visual styles. Static shots kill momentum.',
      },
    ],
  },
};

function NicheMasteryGuide() {
  const [expandedGroup, setExpandedGroup] = useState(null);
  const [expandedNiche, setExpandedNiche] = useState(null);

  return (
    <Section icon={Globe} title="Niche Mastery Guide — 20 Niches" badge="20 niches">
      <div className="mt-3 text-sm text-gray-600 space-y-3">
        <p>
          Each of the 20 niches has optimal settings, recommended styles, and common pitfalls.
          Select a niche group to see detailed recommendations.
        </p>

        <div className="space-y-3 mt-4">
          {Object.entries(NICHE_GUIDE_DATA).map(([groupKey, group]) => (
            <div key={groupKey} className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandedGroup(expandedGroup === groupKey ? null : groupKey)}
                className="w-full flex items-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 transition-colors text-left"
              >
                <group.icon className="w-5 h-5 text-[#2C666E]" />
                <span className="font-semibold text-gray-900 flex-1">{group.label}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#2C666E]/10 text-[#2C666E]">
                  {group.niches.length} niches
                </span>
                {expandedGroup === groupKey
                  ? <ChevronDown className="w-4 h-4 text-gray-400" />
                  : <ChevronRight className="w-4 h-4 text-gray-400" />
                }
              </button>

              {expandedGroup === groupKey && (
                <div className="px-4 pb-4 bg-white border-t border-gray-100 space-y-2">
                  {group.niches.map((niche) => (
                    <div key={niche.key} className="border border-gray-100 rounded-lg overflow-hidden mt-2">
                      <button
                        onClick={() => setExpandedNiche(expandedNiche === niche.key ? null : niche.key)}
                        className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left"
                      >
                        <niche.icon className="w-4 h-4 text-[#2C666E]" />
                        <span className="text-sm font-medium text-gray-900 flex-1">{niche.label}</span>
                        {expandedNiche === niche.key
                          ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                          : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                        }
                      </button>

                      {expandedNiche === niche.key && (
                        <div className="px-3 pb-3 space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <div className="p-2.5 bg-gray-50 rounded-lg">
                              <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Recommended Frameworks</p>
                              <p className="text-xs text-gray-700">{niche.frameworks}</p>
                            </div>
                            <div className="p-2.5 bg-gray-50 rounded-lg">
                              <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Visual Styles</p>
                              <p className="text-xs text-gray-700">{niche.visualStyle}</p>
                            </div>
                            <div className="p-2.5 bg-gray-50 rounded-lg">
                              <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Video Style Presets</p>
                              <p className="text-xs text-gray-700">{niche.videoStyle}</p>
                            </div>
                            <div className="p-2.5 bg-gray-50 rounded-lg">
                              <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Voice Recommendations</p>
                              <p className="text-xs text-gray-700">{niche.voice}</p>
                            </div>
                            <div className="p-2.5 bg-gray-50 rounded-lg">
                              <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Camera Presets</p>
                              <p className="text-xs text-gray-700">{niche.camera}</p>
                            </div>
                            <div className="p-2.5 bg-gray-50 rounded-lg">
                              <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Topic Ideas</p>
                              <p className="text-xs text-gray-700">{niche.topics}</p>
                            </div>
                          </div>

                          <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-[10px] font-bold text-blue-700 uppercase mb-1">Hook Patterns That Work</p>
                            <p className="text-xs text-blue-800 italic">{niche.hooks}</p>
                          </div>

                          <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-[10px] font-bold text-red-700 uppercase mb-1">Common Mistakes to Avoid</p>
                            <p className="text-xs text-red-800">{niche.mistakes}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function ModelDetailCard({ model }) {
  const [expanded, setExpanded] = useState(false);
  const tierColor = model.tier === 'Premium'
    ? 'bg-purple-100 text-purple-700'
    : model.tier === 'Mid'
      ? 'bg-blue-100 text-blue-700'
      : 'bg-green-100 text-green-700';

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900 text-sm">{model.name}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${tierColor}`}>{model.tier}</span>
            {model.audio && <Volume2 className="w-3 h-3 text-green-500" />}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-gray-400">{model.provider}</span>
            <span className="text-[10px] text-gray-300">|</span>
            <span className="text-[10px] text-gray-400">{model.durations}</span>
            <span className="text-[10px] text-gray-300">|</span>
            <span className="text-[10px] text-gray-400">{model.cost}</span>
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          {model.modes.map((m) => (
            <span key={m} className="px-1.5 py-0.5 bg-gray-100 rounded text-[9px] font-medium text-gray-600">{m}</span>
          ))}
        </div>
        {expanded ? <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 bg-white border-t border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Strengths</p>
              <ul className="text-xs text-gray-600 space-y-1">
                {model.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0 mt-0.5" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Weaknesses</p>
              <ul className="text-xs text-gray-600 space-y-1">
                {model.weaknesses.map((w, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <XCircle className="w-3 h-3 text-red-400 shrink-0 mt-0.5" />
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-3 px-3 py-2 bg-[#2C666E]/5 border border-[#2C666E]/15 rounded-lg">
            <p className="text-xs text-[#07393C]"><strong>Best for:</strong> {model.bestFor}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function TroubleshootItem({ problem, causes, fixes }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 text-left"
      >
        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
        <span className="text-sm font-medium text-gray-900 flex-1">{problem}</span>
        {open ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
      </button>
      {open && (
        <div className="px-4 pb-4 bg-white border-t border-gray-100">
          <div className="mt-2">
            <p className="text-xs font-semibold text-red-600 uppercase mb-1">Possible Causes</p>
            <ul className="text-xs text-gray-600 space-y-1">
              {causes.map((c, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <XCircle className="w-3 h-3 text-red-400 shrink-0 mt-0.5" />
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold text-green-600 uppercase mb-1">Fixes</p>
            <ul className="text-xs text-gray-600 space-y-1">
              {fixes.map((f, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0 mt-0.5" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VideoProductionGuidePage() {
  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
      <VideoProductionGuideContent />
    </div>
  );
}
