import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  VisuallyHidden,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Upload,
  Link,
  Image as ImageIcon,
  Download,
  X,
  Video,
  Play,
  Clock,
  ArrowRight,
  ArrowLeft,
  Camera,
  Move,
  Sparkles,
  FolderOpen,
  Lock,
  Volume2,
  VolumeX,
  Search,
  Globe,
  Loader2
} from 'lucide-react';
import LoadingModal from '@/components/canvas/LoadingModal';
import LibraryModal from './LibraryModal';
import { apiFetch } from '@/lib/api';

// Video Generation Models
const VIDEO_MODELS = [
  { 
    id: 'luma-ray', 
    label: '✨ Luma Dream Machine (Ray)', 
    shortLabel: 'Luma Ray',
    description: 'High fidelity, great physics, supports text+image',
    provider: 'luma',
    durationOptions: [5],
    resolutions: ['720p', '1080p'],
    aspectRatios: ['16:9', '9:16', '1:1', '4:3'],
    supportsAudio: false,
    supportsCameraFixed: true,
    supportsEndFrame: true,
    supportsMultipleImages: true,
  },
  { 
    id: 'runway-gen3', 
    label: '🏃 Runway Gen-3 Alpha', 
    shortLabel: 'Runway G3',
    description: 'Cinematic quality, extremely realistic motion',
    provider: 'runway',
    durationOptions: [5, 10],
    resolutions: ['720p'],
    aspectRatios: ['16:9', '9:16'],
    supportsAudio: false,
    supportsCameraFixed: true,
    supportsEndFrame: true,
    supportsMultipleImages: true,
  },
  { 
    id: 'hailuo-minimax', 
    label: '🌊 Hailuo Minimax Video', 
    shortLabel: 'Minimax',
    description: 'Great for anime, stylized, and high-motion',
    provider: 'fal',
    durationOptions: [5],
    resolutions: ['720p', '1080p'],
    aspectRatios: ['16:9', '9:16'],
    supportsAudio: false,
    supportsCameraFixed: false,
    supportsEndFrame: false,
  },
  { 
    id: 'svd', 
    label: '🚀 Stable Video Diffusion (Fast)', 
    shortLabel: 'SVD Fast',
    description: 'Ultra-fast image-to-video motion',
    provider: 'fal',
    durationOptions: [3, 4],
    resolutions: ['480p'],
    aspectRatios: ['16:9'],
    supportsAudio: false,
    supportsCameraFixed: false,
    supportsEndFrame: false,
  },
  { 
    id: 'wavespeed-wan', 
    label: '🚀 Wavespeed WAN 2.2 Spicy', 
    shortLabel: 'Wavespeed',
    description: 'Fast generation, good quality',
    provider: 'wavespeed',
    durationOptions: [4, 5, 6, 8],
    resolutions: ['480p', '720p'],
    aspectRatios: ['16:9', '9:16', '1:1', '4:3'],
    supportsAudio: false,
    supportsCameraFixed: false,
    supportsEndFrame: false,
  },
  { 
    id: 'grok-imagine', 
    label: '🤖 Grok Imagine Video (xAI)', 
    shortLabel: 'Grok xAI',
    description: 'High quality with audio generation',
    provider: 'fal',
    durationOptions: [4, 6, 8, 10, 12, 15],
    resolutions: ['480p', '720p'],
    aspectRatios: ['auto', '16:9', '9:16', '1:1', '4:3', '3:2', '2:3', '3:4'],
    supportsAudio: true,
    supportsCameraFixed: false,
    supportsEndFrame: false,
  },
  { 
    id: 'seedance-pro', 
    label: '🎬 Bytedance Seedance 1.5 Pro', 
    shortLabel: 'Seedance',
    description: '1080p, audio & end frame support',
    provider: 'fal',
    durationOptions: [4, 5, 6, 7, 8, 9, 10, 11, 12],
    resolutions: ['480p', '720p', '1080p'],
    aspectRatios: ['21:9', '16:9', '4:3', '1:1', '3:4', '9:16'],
    supportsAudio: true,
    supportsCameraFixed: true,
    supportsEndFrame: true,
  },
  { 
    id: 'veo3', 
    label: '🌟 Google Veo 3.1', 
    shortLabel: 'Veo 3.1',
    description: 'Google\'s best, 4K, multi-image reference',
    provider: 'fal',
    durationOptions: [8], // Fixed 8 seconds only
    resolutions: ['720p', '1080p', '4k'],
    aspectRatios: ['16:9', '9:16'],
    supportsAudio: true,
    supportsCameraFixed: false,
    supportsEndFrame: false,
    supportsMultipleImages: true, // Can use multiple reference images
  },
  { 
    id: 'veo3-fast', 
    label: '⚡ Google Veo 3.1 Fast', 
    shortLabel: 'Veo Fast',
    description: 'Faster Veo, 4K, flexible duration',
    provider: 'fal',
    durationOptions: [4, 6, 8],
    resolutions: ['720p', '1080p', '4k'],
    aspectRatios: ['auto', '16:9', '9:16'],
    supportsAudio: true,
    supportsCameraFixed: false,
    supportsEndFrame: false,
    supportsNegativePrompt: true,
  },
  { 
    id: 'veo3-first-last', 
    label: '🎬 Veo 3.1 First & Last Frame', 
    shortLabel: 'Veo Morph',
    description: 'Generate video transitioning between two keyframes',
    provider: 'fal',
    durationOptions: [4, 6, 8],
    resolutions: ['720p', '1080p', '4k'],
    aspectRatios: ['auto', '16:9', '9:16'],
    supportsAudio: true,
    supportsCameraFixed: false,
    supportsEndFrame: false,
    supportsNegativePrompt: true,
    requiresFirstLastFrame: true, // Special mode: requires both first AND last frame
  },
  { 
    id: 'ltx-audio-video', 
    label: '🎵 LTX 19B Audio-to-Video', 
    shortLabel: 'LTX A2V',
    description: 'Generates video driven by an audio track',
    provider: 'fal',
    durationOptions: [5], // Adapts to audio length usually
    resolutions: ['720p'],
    aspectRatios: ['16:9'],
    supportsAudio: false,
    supportsCameraFixed: false,
    supportsEndFrame: false,
    requiresAudioUrl: true,
  },
  { 
    id: 'kling-video', 
    label: '🎬 Kling 2.5 Turbo Pro', 
    shortLabel: 'Kling',
    description: 'Cinematic, fluid motion, precise',
    provider: 'fal',
    durationOptions: [5, 10],
    resolutions: ['720p'],
    aspectRatios: ['auto'],
    supportsAudio: false,
    supportsCameraFixed: false,
    supportsEndFrame: true,
    supportsNegativePrompt: true,
    supportsCfgScale: true,
  },
];

// Aspect ratio labels
const ASPECT_RATIO_LABELS = {
  'auto': 'Auto (Best Fit)',
  '21:9': 'Cinematic (21:9)',
  '16:9': 'Landscape (16:9)',
  '9:16': 'Portrait (9:16)',
  '1:1': 'Square (1:1)',
  '4:3': 'Standard (4:3)',
  '3:2': 'Photo (3:2)',
  '2:3': 'Portrait Photo (2:3)',
  '3:4': 'Portrait Standard (3:4)',
};

// Camera Movement Presets
const CAMERA_MOVEMENTS = [
  { value: '', label: 'No Movement' },
  // Realistic / Natural (Best for UGC/Selfie)
  { value: 'static locked-off camera on tripod, perfectly stable with no movement, clean professional stillness', label: '📱 Static/Stable (Selfie)' },
  { value: 'subtle handheld camera micro-shake, the natural tiny tremor of a real person holding a phone, organic imperfect stability', label: '🤳 Subtle Handheld Shake' },
  { value: 'gentle rhythmic camera movement matching natural breathing, slight vertical drift up and down at resting breath pace', label: '😮‍💨 Natural Breathing Motion' },
  { value: 'soft organic lateral sway as if held casually by a relaxed person, gentle weight-shifting motion', label: '🌊 Gentle Natural Sway' },
  // Zoom
  { value: 'slow zoom in', label: 'Slow Zoom In' },
  { value: 'slow zoom out', label: 'Slow Zoom Out' },
  { value: 'fast zoom in', label: 'Fast Zoom (Punch In)' },
  { value: 'dolly zoom', label: 'Dolly Zoom (Vertigo)' },
  // Pan
  { value: 'pan left to right', label: 'Pan Left to Right' },
  { value: 'pan right to left', label: 'Pan Right to Left' },
  { value: 'slow pan', label: 'Slow Pan' },
  // Tilt
  { value: 'tilt up', label: 'Tilt Up' },
  { value: 'tilt down', label: 'Tilt Down' },
  { value: 'tilt up reveal', label: 'Tilt Up Reveal' },
  // Dolly/Track
  { value: 'dolly forward', label: 'Dolly Forward' },
  { value: 'dolly backward', label: 'Dolly Backward' },
  { value: 'tracking shot', label: 'Tracking Shot (Follow)' },
  { value: 'lateral track', label: 'Lateral Tracking' },
  // Complex
  { value: 'orbit', label: 'Orbit Around Subject' },
  { value: 'crane up', label: 'Crane Up' },
  { value: 'crane down', label: 'Crane Down' },
  { value: 'handheld following', label: 'Handheld Following' },
];

// Camera Angle Presets
const CAMERA_ANGLES = [
  { value: '', label: 'Default Angle' },
  // Realistic / Selfie (Best for UGC)
  { value: 'selfie close-up from arm\'s length, front-facing smartphone camera angle, slightly below eye level, wide-angle lens distortion on face edges', label: '🤳 Selfie Close-up' },
  { value: 'talking head framing from chest up, eye-level camera, centered composition with headroom, the standard direct-to-camera setup', label: '🗣️ Talking Head' },
  { value: 'vlog-style framing showing face and upper body with background context visible, slightly wider than selfie, casual handheld energy', label: '📱 Vlog Style' },
  { value: 'webcam angle from slightly above eye level looking down, laptop camera perspective, indoor ambient lighting mixing with screen glow', label: '💻 Webcam Angle' },
  // Standard
  { value: 'eye level', label: 'Eye Level' },
  { value: 'low angle', label: 'Low Angle (Hero)' },
  { value: 'high angle', label: 'High Angle' },
  { value: 'dutch angle', label: 'Dutch Angle (Tilted)' },
  // Wide
  { value: 'wide shot', label: 'Wide Shot' },
  { value: 'medium shot', label: 'Medium Shot' },
  { value: 'close up', label: 'Close Up' },
  { value: 'extreme close up', label: 'Extreme Close Up' },
  // Special
  { value: 'birds eye', label: "Bird's Eye View" },
  { value: 'worms eye', label: "Worm's Eye View" },
  { value: 'over the shoulder', label: 'Over the Shoulder' },
  { value: 'point of view', label: 'POV (First Person)' },
];

// Video Style Presets
const VIDEO_STYLES = [
  { value: '', label: 'Default' },
  // Realistic / UGC (Best for authentic content)
  { value: 'iphone-selfie', label: '📱 iPhone Selfie (Raw)', prompt: 'raw iPhone 15 front-facing camera footage, handheld smartphone video with subtle micro-shake, natural ambient room lighting with soft window light on face, visible skin pores and texture, slight lens distortion at edges, authentic unfiltered color profile, natural eye moisture and light reflections in iris, relaxed genuine expression with asymmetric micro-expressions, casual everyday clothing with real fabric wrinkles' },
  { value: 'ugc-testimonial', label: '🎤 UGC Testimonial', prompt: 'authentic user-generated testimonial video, real person speaking with natural speech cadence and breath pauses, subtle lip movements matching natural talking rhythm, genuine micro-expressions — slight eyebrow raises, natural blinks every 3-4 seconds, real skin with natural imperfections and pores visible, soft ambient indoor lighting from overhead, believable casual setting with slight background depth, conversational eye contact with occasional natural glances away' },
  { value: 'tiktok-style', label: '📲 TikTok/Reels Style', prompt: 'vertical social media content creator video, direct-to-camera engagement with expressive natural facial movements, quick authentic reactions, real skin texture under ring light or natural window light, slightly warm color temperature, genuine personality showing through micro-expressions, natural hand gestures entering frame, contemporary casual styling, energetic but believable body language' },
  { value: 'facetime-call', label: '📞 FaceTime/Video Call', prompt: 'video call aesthetic shot from laptop webcam angle, slightly above eye level, natural indoor ambient lighting mixing with screen glow on face, casual at-home appearance, real skin texture with slight webcam softness, authentic conversational micro-expressions — nodding, natural blinks, subtle smile shifts, relaxed posture, genuine unperformed body language, slight compression artifacts for realism' },
  // Professional
  { value: 'cinematic', label: '🎬 Cinematic', prompt: 'cinematic film quality shot on Arri Alexa, 2.39:1 anamorphic framing feel, professional three-point lighting with soft key light creating gentle shadow fall-off on face, shallow depth of field with creamy bokeh separation, natural skin tones with subtle color grading, film-like motion cadence at 24fps, atmospheric haze catching light, precise composition with leading lines, rich shadow detail without crushing blacks' },
  { value: 'documentary', label: '📹 Documentary', prompt: 'observational documentary style, handheld camera with natural stabilization, available light used authentically, candid unposed moments captured naturally, subject unaware of or comfortable with camera, real environments with lived-in detail, natural skin tones without color grading, genuine emotional moments with real facial expressions, ambient sound atmosphere, journalistic truthful aesthetic' },
  { value: 'commercial', label: '📺 Commercial/Ad', prompt: 'high-end commercial production quality, precisely controlled studio lighting with soft diffusion, product and subject both in sharp focus, polished but natural-looking skin with subtle retouching feel, aspirational warm color palette, smooth controlled camera movement, clean composition with visual breathing room, professional wardrobe and styling, premium feel without looking artificial' },
  { value: 'product-demo', label: '📦 Product Demo', prompt: 'clean professional product demonstration, neutral background with soft gradient, even studio lighting revealing surface texture and material quality, smooth deliberate product handling with natural hand movements, clear visual focus on product features, slight reflection on surface below, precise framing with product as hero, informative angle choices showing form and function' },
  // Artistic
  { value: 'dreamy', label: '✨ Dreamy/Ethereal', prompt: 'ethereal dreamlike quality with soft diffusion filter effect, gentle overexposed highlights wrapping around subject, pastel and desaturated color palette, slow graceful movement, subtle lens glow on light sources, delicate bokeh orbs in background, romantic golden or blue hour natural light, flowing fabric or hair movement suggesting gentle breeze, painterly soft transitions between tones' },
  { value: 'vintage', label: '📼 Vintage/Retro', prompt: 'authentic vintage 16mm film aesthetic, warm amber color shift with faded blacks lifted to milky grey, organic film grain texture visible on skin and surfaces, slight vignette darkening at frame edges, period-appropriate soft focus quality, gentle gate weave and frame instability, nostalgic halation around bright highlights, muted greens shifted toward teal, tactile analogue texture throughout' },
  { value: 'noir', label: '🎞️ Film Noir', prompt: 'classic film noir cinematography, high contrast chiaroscuro lighting with deep blacks and bright specular highlights, dramatic single key light source creating long shadows, venetian blind shadow patterns, smoke or atmospheric haze catching light beams, moody monochromatic or desaturated cool palette, low-key lighting revealing only essential details, reflective wet surfaces' },
  { value: 'anime', label: '🎌 Anime Style', prompt: 'high-quality anime art style animation, vibrant saturated color palette, expressive character animation with fluid motion, dynamic speed lines and impact frames, detailed background art with atmospheric perspective, cel-shaded lighting with crisp shadow edges, wind-blown hair and clothing movement, dramatic camera angles with foreshortening' },
];

// Effect Combos (Quick Presets)
const EFFECT_COMBOS = [
  { id: 'realistic', label: '🤳 Realistic/Raw', effects: ['natural available light with soft shadow transitions', 'visible skin pores and natural texture with subsurface light scattering', 'authentic human movement with natural weight and momentum'] },
  { id: 'cinematic', label: '🎬 Cinematic', effects: ['subtle organic film grain at ISO 800', 'anamorphic lens flare streaks on highlights', 'shallow depth of field with creamy circular bokeh'] },
  { id: 'dreamy', label: '✨ Dreamy', effects: ['soft diffusion glow wrapping around highlights', 'large circular bokeh orbs with chromatic fringing', 'tiny floating particles catching backlight'] },
  { id: 'vintage', label: '📼 Vintage', effects: ['organic 16mm film grain texture', 'natural vignette darkening at frame edges', 'warm amber color shift with lifted blacks'] },
  { id: 'dynamic', label: '⚡ Dynamic', effects: ['directional motion blur on fast movement', 'bright anamorphic lens flare streaks', 'volumetric god rays through atmospheric haze'] },
];

// Special Effects (Categorized)
const SPECIAL_EFFECTS = [
  // Realistic
  { value: 'natural available light with soft shadow transitions and true-to-life color temperature', label: 'Natural Lighting', category: 'realistic' },
  { value: 'visible skin pores, fine facial hair, natural imperfections, subsurface light scattering through skin', label: 'Realistic Skin', category: 'realistic' },
  { value: 'authentic human movement with natural weight transfer, momentum, and subtle involuntary micro-movements', label: 'Natural Motion', category: 'realistic' },
  { value: 'natural eye moisture with catchlight reflections, visible iris detail, realistic pupil size', label: 'Realistic Eyes', category: 'realistic' },
  { value: 'soft focus fall-off mimicking real lens optics with natural depth transition', label: 'Optical Focus', category: 'realistic' },
  // Light
  { value: 'anamorphic lens flare streaks across bright light sources with natural rainbow dispersion', label: 'Lens Flare', category: 'light' },
  { value: 'shallow depth of field with large creamy circular bokeh orbs and slight chromatic fringing', label: 'Bokeh Blur', category: 'light' },
  { value: 'soft diffusion glow wrapping around highlights and bright edges of subject', label: 'Soft Glow', category: 'light' },
  { value: 'volumetric god rays streaming through atmospheric haze, visible light beam shafts', label: 'Light Rays', category: 'light' },
  { value: 'vivid neon light color cast reflecting off wet surfaces and skin, electric color spill', label: 'Neon Glow', category: 'light' },
  { value: 'dappled sunlight filtering through tree canopy, shifting light patches on face and ground', label: 'Dappled Sunlight', category: 'light' },
  // Film
  { value: 'organic photochemical film grain texture visible on skin and midtones, authentic analogue feel', label: 'Film Grain', category: 'film' },
  { value: 'natural optical vignette with gradual darkening toward frame edges drawing focus to center', label: 'Vignette', category: 'film' },
  { value: 'subtle chromatic aberration with color fringing on high-contrast edges, vintage lens character', label: 'Chromatic Aberration', category: 'film' },
  { value: 'directional motion blur on fast movement preserving stillness in static elements', label: 'Motion Blur', category: 'film' },
  { value: 'warm amber color temperature shift, golden skin tones, orange-tinted highlights', label: 'Warm Tones', category: 'film' },
  // Particles
  { value: 'tiny luminous particles floating slowly through air, catching and scattering backlight', label: 'Floating Particles', category: 'particles' },
  { value: 'fine dust motes drifting through visible light beams, natural indoor atmosphere', label: 'Dust Motes', category: 'particles' },
  { value: 'delicate glittering sparkle points appearing and fading in air around subject', label: 'Sparkles', category: 'particles' },
  { value: 'warm glowing embers floating upward through frame, soft orange-red points of light', label: 'Floating Embers', category: 'particles' },
  // Nature
  { value: 'natural wind flowing through hair with individual strand movement, gentle fabric motion', label: 'Wind in Hair', category: 'nature' },
  { value: 'realistic rain falling with visible individual droplets, wet surface reflections, splash impacts', label: 'Rain', category: 'nature' },
  { value: 'gentle snowflakes drifting down at varied speeds and sizes, settling on surfaces and shoulders', label: 'Snow', category: 'nature' },
  { value: 'atmospheric fog or mist rolling through scene creating visible depth layers and soft obscuration', label: 'Fog/Mist', category: 'nature' },
];

// Scene Description Quick Ideas
const SCENE_IDEAS = [
  // Facial expressions & micro-movements
  { label: 'Talking to camera', value: 'person speaking naturally to camera with realistic lip sync and jaw movement, natural breath pauses between sentences, subtle tongue and teeth visible during speech, slight head micro-movements accompanying words, natural blink rhythm every 3-5 seconds, genuine conversational energy', category: 'person' },
  { label: 'Slow genuine smile', value: 'a slow Duchenne smile forming naturally — corners of mouth lifting first, then cheeks rising, crow\'s feet crinkling at outer eye corners, slight narrowing of eyes, teeth gradually becoming visible, warmth spreading across entire face over 2-3 seconds, authentic joy reaching the eyes', category: 'person' },
  { label: 'Nodding thoughtfully', value: 'gentle contemplative head nod with natural neck movement, slight pursing of lips while processing thought, eyes maintaining soft focus with occasional micro-glances, brow slightly furrowed in concentration, chin dipping and rising at natural conversational pace', category: 'person' },
  { label: 'Raised eyebrows', value: 'eyebrows lifting naturally with forehead creasing, eyes widening slightly in genuine surprise or curiosity, mouth parting just slightly, head tilting back almost imperceptibly, the kind of involuntary micro-expression that lasts 1-2 seconds before settling', category: 'person' },
  { label: 'Soft blink', value: 'natural relaxed blink with eyelids closing and opening at realistic speed, slight flutter of eyelashes, eye moisture visible as lids reopen, pupils adjusting subtly to light, calm unfocused gaze settling back into gentle eye contact', category: 'person' },
  { label: 'Slight head tilt', value: 'curious gentle head tilt to one side, neck muscles engaging naturally, one ear dipping closer to shoulder, eyes maintaining contact with slight upward angle, expression of genuine interest and attentive listening, warm approachable body language', category: 'person' },
  // Body language
  { label: 'Hand gestures', value: 'natural illustrative hand gestures while speaking, fingers relaxed and slightly curved, wrist rotating fluidly, hands emphasizing key points at chest height, occasional open-palm gesture, movements timed naturally with speech rhythm, hands returning to rest between gestures', category: 'person' },
  { label: 'Leaning in', value: 'torso shifting forward slightly with natural weight transfer, shoulders angling toward camera, elbows moving inward, chin advancing, creating intimate engaged proximity, facial expression intensifying with interest, the involuntary lean of someone genuinely captivated', category: 'person' },
  { label: 'Relaxed shoulders', value: 'visible tension releasing from shoulders as they drop naturally, neck lengthening, jaw unclenching subtly, breathing deepening and becoming visible in chest, overall posture softening from rigid to comfortable, genuine moment of physical ease', category: 'person' },
  { label: 'Hair touch', value: 'hand rising naturally to tuck a strand of hair behind ear or brush it from forehead, fingers moving through hair with casual practiced ease, brief self-conscious moment, a genuine fidget that communicates comfort and natural human behavior', category: 'person' },
  { label: 'Looking down then up', value: 'eyes dropping downward as if gathering thoughts, slight lowering of chin, brief pause of internal reflection lasting 1-2 seconds, then eyes lifting back to camera with renewed focus and connection, slight smile forming on the return, a natural thoughtful beat', category: 'person' },
  // Natural actions
  { label: 'Deep breath', value: 'a natural deep breath — nostrils flaring slightly on inhale, chest and shoulders rising visibly, brief hold at the top, then a slow controlled exhale with shoulders settling, expression shifting to calm resolve, a grounding moment of genuine composure', category: 'person' },
  { label: 'Subtle laugh', value: 'genuine spontaneous laugh beginning with eyes crinkling, cheeks lifting, mouth opening naturally, slight head tilt back, shoulders shaking briefly, one hand possibly rising toward face, authentic sound of amusement, the involuntary kind you can\'t fake, settling into a warm residual smile', category: 'person' },
  { label: 'Glancing aside', value: 'eyes shifting naturally to one side as if noticing something or recalling a memory, head turning slightly to follow gaze, brief 1-second look away before returning focus to camera, natural eye saccade movement, the kind of authentic glance that breaks the fourth wall feeling', category: 'person' },
  { label: 'Adjusting posture', value: 'subtle weight shift from one side to another, slight hip adjustment, shoulders resettling, chin lifting or tucking, the kind of natural micro-adjustment everyone makes unconsciously every few seconds, maintaining the illusion of a real living person', category: 'person' },
  { label: 'Lip press', value: 'lips pressing together briefly in thought or mild emphasis, slight jaw clench visible in cheek muscle, a momentary expression of consideration before speaking, tongue briefly touching upper lip, the natural oral movements between sentences', category: 'person' },
  { label: 'Eye contact shift', value: 'gaze shifting naturally between looking at camera lens and slightly off-center as if looking at a real person\'s eyes, subtle pupil movement and refocusing, the natural way people maintain eye contact by alternating between left and right eye', category: 'person' },
  // Object & Product movements
  { label: 'Slow rotation', value: 'object rotating smoothly through 360 degrees on invisible turntable, consistent speed, studio lighting catching different surface angles and reflections as it turns, revealing craftsmanship details and material quality from all sides', category: 'object' },
  { label: 'Floating hover', value: 'product levitating and hovering with gentle weight, subtle organic up-and-down drift, slight rotation, soft shadow on surface below shifting with movement, dramatic studio lighting accentuating floating isolation', category: 'object' },
  { label: 'Zoom reveal', value: 'camera slowly pushing in from medium shot to extreme close-up, progressively revealing finer surface texture, material grain, stitching detail, or precision engineering, shallow depth of field increasing as lens approaches', category: 'object' },
  { label: 'Splash/Impact', value: 'dynamic liquid splash erupting around product, individual water droplets suspended in mid-air catching light, particles dispersing outward, frozen-motion energy, high-speed camera aesthetic, dramatic back-lighting through liquid', category: 'object' },
  { label: 'Unboxing reveal', value: 'premium packaging lid lifting open smoothly, product emerging from within, tissue paper parting, dramatic lighting revealing product for the first time, anticipation building through pacing, satisfying tactile unboxing experience', category: 'object' },
  { label: 'Light sweep', value: 'controlled studio light sweeping across product surface from left to right, dramatically revealing contours, embossing, reflective materials, creating moving highlight and shadow that maps the product shape', category: 'object' },
  { label: 'Assembly/Parts', value: 'product components floating into position from different directions, each piece clicking satisfyingly into place, mechanical precision, the assembled whole emerging greater than its parts, engineering showcase', category: 'object' },
  { label: 'In-use demo', value: 'natural human hand interacting with product in real-world context, demonstrating primary function with smooth practiced ease, showing scale relative to hand, authentic grip and touch, real-world lighting and environment', category: 'object' },
  // Environment & Scene
  { label: 'Parallax depth', value: 'subtle lateral camera drift revealing multiple depth planes, foreground elements sliding past midground and background at different rates, creating dimensional depth and visual richness in an otherwise static scene', category: 'scene' },
  { label: 'Time-lapse', value: 'accelerated time passage with clouds streaming across sky, shadows rotating and lengthening, light color shifting from golden to blue, traffic or people flowing as blurred streaks, static elements anchoring the moving world', category: 'scene' },
  { label: 'Gentle breeze', value: 'soft wind flowing through scene causing leaves to rustle and sway, grass bending in waves, light fabric billowing gently, hair lifting slightly, creating the feeling of a living breathing environment', category: 'scene' },
  { label: 'Water ripple', value: 'calm water surface with concentric ripples expanding outward from a point, reflections of sky and surroundings distorting and reforming, gentle light dancing across water surface, peaceful meditative motion', category: 'scene' },
  { label: 'Atmospheric fog', value: 'low-lying fog or mist drifting slowly through scene, creating visible depth layers, softening distant elements, volumetric light shafts penetrating through haze, mysterious and moody atmosphere building depth', category: 'scene' },
  { label: 'Golden hour', value: 'warm golden sunlight from low sun angle, long dramatic shadows stretching across surface, warm orange-amber light wrapping around subjects, backlit edges glowing, the most flattering natural light condition', category: 'scene' },
];

// Description Presets
const DESCRIPTION_PRESETS = [
  // People
  { id: 'authentic', label: '🤳 Authentic/Raw', category: 'person', prompt: 'real person filmed candidly, visible skin pores and natural texture, uneven skin tone and small imperfections that read as human, natural available light creating soft shadows under chin and nose, unretouched genuine appearance, slightly asymmetric facial features, real fabric texture on clothing with natural wrinkles, the unmistakable look of unfiltered reality' },
  { id: 'talking', label: '🗣️ Talking Natural', category: 'person', prompt: 'person speaking naturally with realistic lip and jaw movement synced to speech rhythm, natural breath pauses every 5-8 words, subtle tongue visibility on certain consonants, eyebrows rising on emphasized words, head nodding micro-movements accompanying key points, natural blink pattern, casual relaxed shoulders, genuine conversational energy as if talking to a friend' },
  { id: 'testimonial', label: '⭐ Testimonial', category: 'person', prompt: 'heartfelt authentic testimonial, person sharing genuine experience with visible emotional investment, slight vocal emphasis on key moments, eyes brightening when recalling positive memories, natural speech imperfections like brief pauses and word searching, believable enthusiasm that builds organically, relatable everyday appearance, the kind of real unscripted endorsement that feels trustworthy' },
  { id: 'thinking', label: '🤔 Thinking Moment', category: 'person', prompt: 'person in genuine contemplation, eyes drifting slightly upward and to one side as if accessing memory, lips pressing together briefly, subtle jaw tension, brow furrowing with fine wrinkle lines appearing, fingers perhaps touching chin or temple, the visible internal process of gathering thoughts before speaking, a natural pregnant pause that feels unscripted' },
  { id: 'excited', label: '😊 Genuine Excitement', category: 'person', prompt: 'authentic excitement building visibly across the face — eyes widening with pupils dilating slightly, eyebrows lifting, a smile growing from closed-lip to open showing teeth, slight forward lean of entire torso, hands possibly coming together or gesturing outward, increased blink rate, the contagious energy of someone genuinely thrilled, cheeks flushing slightly with real emotion' },
  { id: 'calm', label: '😌 Calm & Centered', category: 'person', prompt: 'deeply calm centered presence, slow measured breathing visible in gentle chest rise and fall, relaxed jaw and softened facial muscles, half-lidded comfortable eyes with steady gentle gaze, shoulders low and settled, head balanced naturally on neck without tension, serene half-smile, the composed stillness of someone completely at ease in the moment' },
  { id: 'confident', label: '💪 Quiet Confidence', category: 'person', prompt: 'quietly confident person with steady unwavering eye contact, chin level and centered, subtle assured close-lipped smile, grounded upright posture without rigidity, shoulders back naturally, deliberate unhurried movements, the self-possessed energy of someone who doesn\'t need to prove anything, calm strong presence that commands attention without demanding it' },
  { id: 'lifestyle', label: '🌟 Lifestyle', category: 'person', prompt: 'aspirational lifestyle moment that feels achievable and real, person in a beautiful but believable natural environment, warm golden ambient lighting, candid movement that feels unposed, genuine comfort and belonging in the space, real fabric textures and natural materials in setting, the kind of authentic aspirational content that inspires without feeling manufactured' },
  // Product & Object
  { id: 'product-hero', label: '📦 Product Hero', category: 'object', prompt: 'premium product hero shot with controlled studio lighting, key light creating defined highlight edge, fill light opening shadows to reveal detail, smooth slow rotation revealing all design surfaces, visible material quality — texture grain, reflective surfaces, matte finishes, precise manufacturing details, professional commercial photography quality translated to motion' },
  { id: 'product-context', label: '🏠 Product in Context', category: 'object', prompt: 'product placed naturally in real-world lifestyle setting, warm ambient lighting from windows or practical sources, surrounding environment telling a story about the product\'s use case, natural material textures in the setting complementing the product, shallow depth of field keeping product sharp against softly blurred environment, aspirational but believable and relatable context' },
  { id: 'product-close', label: '🔍 Macro Close-up', category: 'object', prompt: 'extreme macro close-up revealing surface texture at near-microscopic detail, visible material grain and manufacturing precision, shallow depth of field with only a thin slice in focus, subtle rack focus pulling attention across surface features, highlighting craftsmanship and quality that isn\'t visible at normal viewing distance, premium tactile detail' },
  { id: 'product-dynamic', label: '💥 Dynamic Product', category: 'object', prompt: 'high-energy dynamic product reveal with explosive motion, product emerging through particles or liquid splash, dramatic rim lighting creating bright edge separation, bold dramatic shadows, kinetic energy captured at peak moment, high-speed camera aesthetic freezing dynamic elements, attention-commanding visual impact, broadcast commercial quality' },
  { id: 'food-drink', label: '🍽️ Food & Drink', category: 'object', prompt: 'mouth-watering food or drink presentation with visible steam rising and curling naturally, liquid pouring with realistic fluid dynamics and splashing, fresh ingredients glistening with moisture droplets, warm inviting key light from above creating appetizing highlights, visible texture of every ingredient surface, the kind of sensory-rich food videography that triggers genuine hunger' },
  { id: 'tech-gadget', label: '💻 Tech/Gadget', category: 'object', prompt: 'sleek technology product with precision-engineered surfaces catching controlled studio light, subtle screen glow illuminating immediate surroundings, clean minimal dark or gradient background isolating the product, reflections in glossy surfaces revealing the studio environment, precise edge lighting defining the form factor, premium technology aesthetic communicating innovation and quality' },
  // Scene & Environment
  { id: 'nature-scene', label: '🌿 Nature Scene', category: 'scene', prompt: 'serene natural landscape with organic movement in foliage responding to gentle wind, soft diffused natural light filtering through atmosphere, individual leaves and grass blades moving independently, birds or insects adding background life, natural color palette without artificial saturation, the meditative quality of real undisturbed nature, cinematic wide establishing shot with depth layers' },
  { id: 'urban-vibe', label: '🏙️ Urban/City', category: 'scene', prompt: 'atmospheric urban street scene with layered city energy, neon signage reflecting off wet pavement, pedestrians moving through frame at varied paces, vehicle headlights creating light streaks, modern architecture with glass reflections of surrounding buildings, steam rising from grates, the textured gritty beauty of a real city at golden hour or twilight' },
  { id: 'aerial-view', label: '🛩️ Aerial/Drone', category: 'scene', prompt: 'smooth cinematic aerial drone footage with slow controlled flight path, sweeping bird\'s eye perspective revealing landscape scale and patterns, natural topography creating visual rhythm, long shadows indicating time of day, the awe-inspiring perspective shift that only altitude provides, gradual reveal of destination or feature, 4K clarity with atmospheric haze adding depth' },
  { id: 'cozy-interior', label: '🛋️ Cozy Interior', category: 'scene', prompt: 'warm inviting interior space with layered soft lighting from practical sources — table lamps, candles, fireplace glow — creating pools of warm light, rich comfortable textures visible in fabrics and surfaces, gentle steam rising from a hot drink, subtle dust motes in light beams, the intimate tactile comfort of a lived-in space that feels like home' },
];

/**
 * JumpStartModal - Image to Video Generation (Simplified)
 */
export default function JumpStartModal({ 
  isOpen, 
  onClose, 
  username = 'default',
  onVideoGenerated,
  isEmbedded = false
}) {
  const [currentStep, setCurrentStep] = useState(1);
  
  // Image upload
  const [uploadedImage, setUploadedImage] = useState(null);
  const [additionalImages, setAdditionalImages] = useState([]); // For multi-image models like Veo 3.1
  const [endFrameImage, setEndFrameImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [showUrlImport, setShowUrlImport] = useState(false);
  const [showEndFrameUrlImport, setShowEndFrameUrlImport] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [libraryTarget, setLibraryTarget] = useState('start'); // 'start', 'end', or 'additional'
  const [urlInput, setUrlInput] = useState('');
  
  // Web search state
  const [showWebSearch, setShowWebSearch] = useState(false);
  const [webSearchTarget, setWebSearchTarget] = useState('start'); // 'start', 'end', or 'additional'
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Video settings
  const [videoModel, setVideoModel] = useState('wavespeed-wan');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [resolution, setResolution] = useState('720p');
  const [duration, setDuration] = useState(5);
  const [cameraMovement, setCameraMovement] = useState('');
  const [cameraAngle, setCameraAngle] = useState('');
  const [videoStyle, setVideoStyle] = useState('');
  const [specialEffects, setSpecialEffects] = useState([]);
  const [sceneDescription, setSceneDescription] = useState('');
  const [description, setDescription] = useState('');
  
  // Model-specific settings
  const [enableAudio, setEnableAudio] = useState(true);
  const [drivingAudioUrl, setDrivingAudioUrl] = useState('');
  const [audioTranscript, setAudioTranscript] = useState('');
  const [cameraFixed, setCameraFixed] = useState(false);
  const [negativePrompt, setNegativePrompt] = useState('');
  const [cfgScale, setCfgScale] = useState(0.5);
  const [sceneIdeaFilter, setSceneIdeaFilter] = useState('all');
  const [presetFilter, setPresetFilter] = useState('all');
  
  // Generated video
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState(null);
  const [hasAddedToEditor, setHasAddedToEditor] = useState(false);
  
  const fileInputRef = useRef(null);
  const endFrameInputRef = useRef(null);
  const pollIntervalRef = useRef(null);
  const contentRef = useRef(null);

  // Helper to save media to library
  const saveToLibrary = async (url, type = 'image', title = '', source = 'jumpstart') => {
    try {
      console.log(`[JumpStart] Saving ${type} to library:`, url.substring(0, 50) + '...');
      const response = await apiFetch('/api/library/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, type, title, source }),
      });
      const data = await response.json();
      if (data.saved) {
        console.log(`[JumpStart] Successfully saved ${type} to library:`, data.id);
      } else {
        console.warn(`[JumpStart] ${type} not saved:`, data.message || 'Unknown reason');
      }
    } catch (err) {
      console.error('[JumpStart] Failed to save to library:', err);
    }
  };

  // Scroll to top when step changes
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  }, [currentStep]);

  // Get current model config
  const currentModel = VIDEO_MODELS.find(m => m.id === videoModel) || VIDEO_MODELS[0];

  // Reset modal state when opened
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setUploadedImage(null);
      setAdditionalImages([]);
      setEndFrameImage(null);
      setIsLoading(false);
      setLoadingMessage('');
      setShowUrlImport(false);
      setShowEndFrameUrlImport(false);
      setUrlInput('');
      setShowWebSearch(false);
      setSearchQuery('');
      setSearchResults([]);
      setIsSearching(false);
      setVideoModel('wavespeed-wan');
      setAspectRatio('16:9');
      setResolution('720p');
      setDuration(5);
      setCameraMovement('');
      setCameraAngle('');
      setVideoStyle('');
      setSpecialEffects([]);
      setSceneDescription('');
      setDescription('');
      setEnableAudio(true);
      setAudioTranscript('');
      setCameraFixed(false);
      setNegativePrompt('');
      setCfgScale(0.5);
      setSceneIdeaFilter('all');
      setPresetFilter('all');
      setGeneratedVideoUrl(null);
      setHasAddedToEditor(false);
    }
  }, [isOpen]);

  // Stop polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearTimeout(pollIntervalRef.current);
      }
    };
  }, []);

  const handleModelChange = (newModelId) => {
    const newModel = VIDEO_MODELS.find(m => m.id === newModelId);
    if (!newModel) return;
    
    setVideoModel(newModelId);
    
    // Reset aspect ratio if not supported
    if (!newModel.aspectRatios.includes(aspectRatio)) {
      setAspectRatio(newModel.aspectRatios[0]);
    }
    
    // Reset resolution if not supported
    if (!newModel.resolutions.includes(resolution)) {
      setResolution(newModel.resolutions[0]);
    }
    
    // Reset duration if not in options
    if (!newModel.durationOptions.includes(duration)) {
      setDuration(newModel.durationOptions[0]);
    }
    
    // Reset audio if not supported
    if (!newModel.supportsAudio) {
      setEnableAudio(false);
      setAudioTranscript('');
    } else {
      setEnableAudio(true);
    }
    
    // Reset end frame if not supported
    if (!newModel.supportsEndFrame) {
      setEndFrameImage(null);
    }
    
    // Reset camera fixed if not supported
    if (!newModel.supportsCameraFixed) {
      setCameraFixed(false);
    }
  };

  const handleFileUpload = async (e, target = 'start') => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target.result;
      if (target === 'start') {
        setUploadedImage(dataUrl);
        // Save uploaded image to library
        saveToLibrary(dataUrl, 'image', `JumpStart Upload - ${new Date().toLocaleString()}`, 'jumpstart-upload');
      } else if (target === 'additional') {
        setAdditionalImages(prev => [...prev, dataUrl]);
        saveToLibrary(dataUrl, 'image', `JumpStart Reference - ${new Date().toLocaleString()}`, 'jumpstart-upload');
      } else {
        setEndFrameImage(dataUrl);
        saveToLibrary(dataUrl, 'image', `JumpStart End Frame - ${new Date().toLocaleString()}`, 'jumpstart-upload');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUrlImport = (target = 'start') => {
    if (!urlInput.trim()) return;
    
    const url = urlInput.trim();
    if (target === 'start') {
      setUploadedImage(url);
      setShowUrlImport(false);
      // Save imported URL to library
      saveToLibrary(url, 'image', `JumpStart Import - ${new Date().toLocaleString()}`, 'jumpstart-import');
    } else if (target === 'additional') {
      setAdditionalImages(prev => [...prev, url]);
      setShowUrlImport(false);
      saveToLibrary(url, 'image', `JumpStart Reference Import - ${new Date().toLocaleString()}`, 'jumpstart-import');
    } else {
      setEndFrameImage(url);
      setShowEndFrameUrlImport(false);
      saveToLibrary(url, 'image', `JumpStart End Frame Import - ${new Date().toLocaleString()}`, 'jumpstart-import');
    }
    setUrlInput('');
  };

  const handleLibrarySelect = (item) => {
    const url = item.image_url || item.url;
    if (libraryTarget === 'start') {
      setUploadedImage(url);
    } else if (libraryTarget === 'additional') {
      setAdditionalImages(prev => [...prev, url]);
    } else {
      setEndFrameImage(url);
    }
    setShowLibrary(false);
    // No need to save - already in library
  };
  
  const removeAdditionalImage = (index) => {
    setAdditionalImages(prev => prev.filter((_, i) => i !== index));
  };

  // Web image search
  const handleWebSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a search query');
      return;
    }

    setIsSearching(true);
    setSearchResults([]);

    try {
      const response = await apiFetch('/api/images/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Search failed');
      }

      if (data.images && data.images.length > 0) {
        setSearchResults(data.images);
      } else {
        toast.info('No images found. Try a different search term.');
      }
    } catch (error) {
      console.error('Web search error:', error);
      toast.error(error.message || 'Failed to search images');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = async (imageResult) => {
    const url = imageResult.url;
    
    // Import the image to avoid CORS issues
    try {
      const response = await apiFetch('/api/images/import-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: url, username }),
      });
      
      const data = await response.json();
      const finalUrl = data.url || url;
      
      if (webSearchTarget === 'start') {
        setUploadedImage(finalUrl);
      } else if (webSearchTarget === 'additional') {
        setAdditionalImages(prev => [...prev, finalUrl]);
      } else {
        setEndFrameImage(finalUrl);
      }
      
      // Save to library
      saveToLibrary(finalUrl, 'image', imageResult.title || `Web Search - ${searchQuery}`, 'jumpstart-websearch');
      
      setShowWebSearch(false);
      setSearchQuery('');
      setSearchResults([]);
      toast.success('Image imported!');
    } catch (error) {
      console.error('Import error:', error);
      // Fallback to direct URL
      if (webSearchTarget === 'start') {
        setUploadedImage(url);
      } else if (webSearchTarget === 'additional') {
        setAdditionalImages(prev => [...prev, url]);
      } else {
        setEndFrameImage(url);
      }
      setShowWebSearch(false);
      setSearchQuery('');
      setSearchResults([]);
    }
  };

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearTimeout(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  const buildPrompt = () => {
    const parts = [];
    
    // Scene description first (most important)
    if (sceneDescription.trim()) {
      parts.push(sceneDescription.trim());
    }
    
    // Video style with prompt
    const styleConfig = VIDEO_STYLES.find(s => s.value === videoStyle);
    if (styleConfig?.prompt) {
      parts.push(styleConfig.prompt);
    }
    
    // Description/motion preset
    if (description.trim()) {
      parts.push(description.trim());
    }
    
    // Camera movement (skip for realistic styles to preserve authenticity)
    const isRealisticStyle = ['iphone-selfie', 'ugc-testimonial', 'tiktok-style', 'facetime-call'].includes(videoStyle);
    if (cameraMovement && !isRealisticStyle) {
      parts.push(cameraMovement);
    } else if (cameraMovement && isRealisticStyle && cameraMovement.includes('subtle')) {
      parts.push('subtle natural movement');
    }
    
    // Camera angle
    if (cameraAngle) {
      parts.push(`${cameraAngle} shot`);
    }
    
    // Special effects
    if (specialEffects.length > 0) {
      parts.push(specialEffects.join(', '));
    }
    
    // Quality boosters for realistic styles
    if (isRealisticStyle) {
      parts.push('photorealistic with natural skin texture and visible pores, authentic micro-expressions and natural blink rhythm, believable weight and momentum in all movement, real-world lighting with true color temperature, natural imperfections that read as human');
    } else {
      // General quality booster for all non-realistic styles
      parts.push('high production quality, smooth natural motion, consistent lighting');
    }

    // Aspect ratio hint
    if (aspectRatio !== 'auto') {
      const isPortrait = ['9:16', '3:4', '2:3'].includes(aspectRatio);
      parts.push(isPortrait ? 'vertical portrait video' : 'horizontal video');
    }

    return parts.join(', ') || 'smooth natural motion with realistic physics and weight, high quality video with natural lighting and authentic detail';
  };

  const pollForResult = async (requestId, model) => {
    try {
      const response = await apiFetch('/api/jumpstart/result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, model }),
      });

      if (!response.ok) throw new Error('Failed to check status');

      const data = await response.json();
      
      if (data.queuePosition) {
        setLoadingMessage(`In queue (position ${data.queuePosition})...`);
      }
      
      if (data.status === 'completed') {
        stopPolling();
        setIsLoading(false);
        setGeneratedVideoUrl(data.videoUrl);
        setCurrentStep(3);
        setHasAddedToEditor(false);
        toast.success('Video generated successfully!');
        
        // Notify parent if callback provided (parent handles library save)
        if (onVideoGenerated) {
          onVideoGenerated(data.videoUrl, `JumpStart - ${videoStyle || 'Generated'}`, 'jumpstart', duration);
        }
      } else if (data.status === 'failed') {
        stopPolling();
        setIsLoading(false);
        toast.error(data.error || 'Video generation failed');
      } else {
        pollIntervalRef.current = setTimeout(() => {
          pollForResult(requestId, model);
        }, 3000);
      }
    } catch (error) {
      console.error('Poll error:', error);
    }
  };

  const handleGenerateVideo = async () => {
    if (!uploadedImage) {
      toast.error('Please upload an image first');
      return;
    }
    
    // Validate first-last frame mode
    if (currentModel.requiresFirstLastFrame && !endFrameImage) {
      toast.error('Please upload both first and last frame images');
      return;
    }

    setIsLoading(true);
    const prompt = buildPrompt();
    const modelName = currentModel.label;
    setLoadingMessage(`${modelName} is generating your video...`);

    try {
      // Convert image to blob if it's a data URL
      let imageBlob;
      if (uploadedImage.startsWith('data:')) {
        const response = await fetch(uploadedImage);
        imageBlob = await response.blob();
      } else {
        // For URLs, fetch the image
        const response = await fetch(uploadedImage);
        imageBlob = await response.blob();
      }

      const formData = new FormData();
      formData.append('image', imageBlob, 'image.jpg');
      formData.append('prompt', prompt);
      formData.append('model', videoModel);
      formData.append('resolution', resolution);
      formData.append('duration', duration.toString());
      formData.append('aspectRatio', aspectRatio);
      formData.append('username', username);
      
      // Model-specific settings
      if (currentModel.supportsAudio) {
        formData.append('enableAudio', enableAudio.toString());
        if (enableAudio && audioTranscript.trim()) {
          formData.append('audioTranscript', audioTranscript.trim());
        }
      }
      
      if (currentModel.supportsCameraFixed) {
        formData.append('cameraFixed', cameraFixed.toString());
      }
      
      if (currentModel.supportsEndFrame && endFrameImage) {
        formData.append('endImageUrl', endFrameImage);
      }
      
      if (currentModel.supportsNegativePrompt && negativePrompt.trim()) {
        formData.append('negativePrompt', negativePrompt.trim());
      }
      
      if (currentModel.supportsCfgScale) {
        formData.append('cfgScale', cfgScale.toString());
      }

      if (currentModel.requiresAudioUrl) {
        if (!drivingAudioUrl) {
          setIsLoading(false);
          toast.error("An Audio URL is required for this model.");
          return;
        }
        formData.append('audioUrl', drivingAudioUrl);
      }
      
      // Multi-image support for Veo 3.1
      if (currentModel.supportsMultipleImages && additionalImages.length > 0) {
        formData.append('additionalImages', JSON.stringify(additionalImages));
      }

      console.log('[JumpStart] Generating with:', { model: videoModel, aspectRatio, resolution, duration, enableAudio });

      const result = await apiFetch('/api/jumpstart/generate', {
        method: 'POST',
        body: formData,
      });

      const data = await result.json();

      if (!result.ok) {
        throw new Error(data.error || 'Failed to start generation');
      }

      if (data.videoUrl) {
        // Immediate result
        setIsLoading(false);
        setGeneratedVideoUrl(data.videoUrl);
        setCurrentStep(3);
        setHasAddedToEditor(false);
        toast.success('Video generated!');
        
        // Notify parent if callback provided (parent handles library save)
        if (onVideoGenerated) {
          onVideoGenerated(data.videoUrl, `JumpStart - ${videoStyle || 'Generated'}`, 'jumpstart', duration);
        }
      } else if (data.requestId) {
        setLoadingMessage(`${modelName} is processing...`);
        pollForResult(data.requestId, videoModel);
      } else {
        throw new Error('No request ID returned');
      }
    } catch (error) {
      console.error('Generate error:', error);
      stopPolling();
      setIsLoading(false);
      toast.error(error.message || 'Failed to generate video');
    }
  };

  const handleDownloadVideo = () => {
    if (!generatedVideoUrl) return;
    
    const link = document.createElement('a');
    link.download = 'jumpstart-video.mp4';
    link.href = generatedVideoUrl;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Download started!');
  };

  const handleAddToEditor = () => {
    if (generatedVideoUrl && onVideoGenerated && !hasAddedToEditor) {
      onVideoGenerated(generatedVideoUrl, `JumpStart - ${videoStyle || 'Video'}`, 'jumpstart');
      setHasAddedToEditor(true);
      toast.success('Video added to your collection!');
    }
  };

  const handleClose = () => {
    stopPolling();
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-6xl w-[95vw] h-[90vh] flex flex-col p-0 gap-0">
          <VisuallyHidden>
            <DialogTitle>JumpStart - Image to Video</DialogTitle>
            <DialogDescription>Transform your image into an animated video</DialogDescription>
          </VisuallyHidden>
          {/* Header */}
          <div className="p-4 border-b bg-gradient-to-r from-[#90DDF0]/20 to-[#2C666E]/10 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#2C666E] rounded-lg">
                  <Video className="w-5 h-5 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-semibold text-gray-900">JumpStart - Image to Video</DialogTitle>
                  <DialogDescription className="text-sm text-gray-600">Transform your image into an animated video</DialogDescription>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={handleClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Step Indicator */}
          <div className="p-3 bg-white border-b flex items-center justify-center gap-8">
            {[
              { num: 1, label: 'Upload Image' },
              { num: 2, label: 'Video Settings' },
              { num: 3, label: 'Preview' }
            ].map((step, idx) => (
              <React.Fragment key={step.num}>
                <div className={`flex items-center gap-2 ${currentStep === step.num ? 'text-[#07393C] font-semibold' : 'text-gray-400'}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                    currentStep === step.num ? 'bg-[#2C666E] text-white' : 
                    currentStep > step.num ? 'bg-[#90DDF0] text-[#07393C]' : 'bg-gray-200 text-gray-500'
                  }`}>
                    {step.num}
                  </div>
                  <span className="hidden sm:inline">{step.label}</span>
                </div>
                {idx < 2 && <ArrowRight className="w-4 h-4 text-gray-300" />}
              </React.Fragment>
            ))}
          </div>

          {/* Content */}
          <div ref={contentRef} className="flex-1 overflow-y-auto p-6 bg-gray-50">
            {/* Step 1: Upload Image */}
            {currentStep === 1 && (
              <div className="max-w-4xl mx-auto space-y-6">
                {/* Model Selector - Compact Dropdown */}
                <div className="bg-white rounded-lg p-4 border shadow-sm">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-[#2C666E]" />
                      <h3 className="font-semibold text-gray-900">AI Model</h3>
                    </div>
                    <select
                      value={videoModel}
                      onChange={(e) => handleModelChange(e.target.value)}
                      className="flex-1 max-w-xs px-3 py-2 border border-[#2C666E] rounded-lg text-sm bg-white font-medium"
                    >
                      {VIDEO_MODELS.map(model => (
                        <option key={model.id} value={model.id}>{model.label}</option>
                      ))}
                    </select>
                  </div>
                  {/* Model details summary */}
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-gray-500">{currentModel.description}</span>
                    <span className="text-gray-300">|</span>
                    <span className="text-gray-500">
                      {currentModel.durationOptions.length === 1 
                        ? `${currentModel.durationOptions[0]}s` 
                        : `${currentModel.durationOptions[0]}-${currentModel.durationOptions[currentModel.durationOptions.length - 1]}s`}
                    </span>
                    <span className="text-gray-300">|</span>
                    <span className="text-gray-500">{currentModel.resolutions.join(', ')}</span>
                    {currentModel.supportsAudio && (
                      <span className="bg-[#90DDF0]/30 text-[#07393C] px-1.5 py-0.5 rounded">🔊 Audio</span>
                    )}
                    {currentModel.supportsEndFrame && (
                      <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">🎯 End Frame</span>
                    )}
                    {currentModel.supportsCameraFixed && (
                      <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">📍 Lock Camera</span>
                    )}
                    {currentModel.supportsMultipleImages && (
                      <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded">📸 Multi-Image</span>
                    )}
                    {currentModel.supportsNegativePrompt && (
                      <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded">🚫 Negative Prompt</span>
                    )}
                  </div>
                </div>

                {/* Start Image Upload */}
                <div className="bg-white rounded-lg p-4 border shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <ImageIcon className="w-5 h-5 text-[#2C666E]" />
                    <h3 className="font-semibold text-gray-900">
                      {currentModel.requiresFirstLastFrame ? 'Upload First Frame' : 'Upload Start Image'}
                    </h3>
                    {currentModel.requiresFirstLastFrame && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Required</span>
                    )}
                  </div>
                  
                  {uploadedImage ? (
                    <div className="relative">
                      <img 
                        src={uploadedImage} 
                        alt="Uploaded" 
                        className="w-full max-h-[300px] object-contain rounded-lg border bg-gray-100" 
                      />
                      <button 
                        onClick={() => setUploadedImage(null)}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-[#2C666E] hover:bg-[#2C666E]/5 transition-colors"
                      >
                        <Upload className="w-10 h-10 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm text-gray-600">Click to upload or drag & drop</p>
                        <p className="text-xs text-gray-400 mt-1">PNG, JPG, WebP up to 10MB</p>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => { setWebSearchTarget('start'); setShowWebSearch(true); setShowUrlImport(false); }}
                        >
                          <Globe className="w-4 h-4 mr-2" />
                          Search Web
                        </Button>
                        <Button 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => { setShowUrlImport(true); setShowWebSearch(false); }}
                        >
                          <Link className="w-4 h-4 mr-2" />
                          Import URL
                        </Button>
                        <Button 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => { setLibraryTarget('start'); setShowLibrary(true); }}
                        >
                          <FolderOpen className="w-4 h-4 mr-2" />
                          Library
                        </Button>
                      </div>
                      
                      {/* Web Search Panel */}
                      {showWebSearch && webSearchTarget === 'start' && (
                        <div className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                          <div className="flex gap-2 mb-3">
                            <div className="relative flex-1">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                              <Input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleWebSearch()}
                                placeholder="Search for images... (e.g., 'woman selfie natural light')"
                                className="pl-9"
                              />
                            </div>
                            <Button onClick={handleWebSearch} disabled={isSearching}>
                              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
                            </Button>
                            <Button variant="ghost" onClick={() => { setShowWebSearch(false); setSearchResults([]); setSearchQuery(''); }}>
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                          
                          {isSearching && (
                            <div className="flex items-center justify-center py-8">
                              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                              <span className="ml-2 text-sm text-gray-600">Searching...</span>
                            </div>
                          )}
                          
                          {searchResults.length > 0 && (
                            <div className="grid grid-cols-4 gap-2 max-h-[200px] overflow-y-auto">
                              {searchResults.map((img, idx) => (
                                <div 
                                  key={idx}
                                  onClick={() => handleSelectSearchResult(img)}
                                  className="relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 border-transparent hover:border-blue-500 transition-all group"
                                >
                                  <img 
                                    src={img.thumbnail || img.url} 
                                    alt={img.title || 'Search result'} 
                                    className="w-full h-full object-cover"
                                  />
                                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <span className="text-white text-xs font-medium">Select</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {!isSearching && searchResults.length === 0 && searchQuery && (
                            <p className="text-xs text-gray-500 text-center py-4">
                              Press Enter or click Search to find images
                            </p>
                          )}
                        </div>
                      )}
                      
                      {showUrlImport && (
                        <div className="flex gap-2 mt-2">
                          <Input
                            value={urlInput}
                            onChange={(e) => setUrlInput(e.target.value)}
                            placeholder="Paste image URL..."
                            className="flex-1"
                          />
                          <Button onClick={() => handleUrlImport('start')}>Import</Button>
                          <Button variant="ghost" onClick={() => setShowUrlImport(false)}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, 'start')}
                  />
                </div>

                {/* End Frame / Last Frame */}
                {(currentModel.supportsEndFrame || currentModel.requiresFirstLastFrame) && (
                  <div className={`bg-white rounded-lg p-4 border shadow-sm ${currentModel.requiresFirstLastFrame ? 'border-blue-200 bg-blue-50/30' : ''}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <ImageIcon className={`w-5 h-5 ${currentModel.requiresFirstLastFrame ? 'text-blue-600' : 'text-purple-600'}`} />
                      <h3 className="font-semibold text-gray-900">
                        {currentModel.requiresFirstLastFrame ? 'Upload Last Frame' : 'End Frame Image'}
                      </h3>
                      {currentModel.requiresFirstLastFrame ? (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Required</span>
                      ) : (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">Optional - Seedance Feature</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mb-3">
                      {currentModel.requiresFirstLastFrame 
                        ? 'The AI will generate a smooth video transition from the first frame to this last frame.'
                        : 'The video will transition to this final frame. Leave empty for AI-generated ending.'}
                    </p>
                    
                    {endFrameImage ? (
                      <div className="relative">
                        <img 
                          src={endFrameImage} 
                          alt="End Frame" 
                          className="w-full max-h-[200px] object-contain rounded-lg border bg-gray-100" 
                        />
                        <button 
                          onClick={() => setEndFrameImage(null)}
                          className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            className="flex-1"
                            onClick={() => { setWebSearchTarget('end'); setShowWebSearch(true); }}
                          >
                            <Globe className="w-4 h-4 mr-2" />
                            Search Web
                          </Button>
                          <Button 
                            variant="outline" 
                            className="flex-1"
                            onClick={() => endFrameInputRef.current?.click()}
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Upload
                          </Button>
                          <Button 
                            variant="outline" 
                            className="flex-1"
                            onClick={() => { setLibraryTarget('end'); setShowLibrary(true); }}
                          >
                            <FolderOpen className="w-4 h-4 mr-2" />
                            Library
                          </Button>
                        </div>
                        
                        {/* Web Search Panel for End Frame */}
                        {showWebSearch && webSearchTarget === 'end' && (
                          <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                            <div className="flex gap-2 mb-3">
                              <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input
                                  value={searchQuery}
                                  onChange={(e) => setSearchQuery(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && handleWebSearch()}
                                  placeholder="Search for end frame image..."
                                  className="pl-9"
                                />
                              </div>
                              <Button onClick={handleWebSearch} disabled={isSearching} size="sm">
                                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => { setShowWebSearch(false); setSearchResults([]); setSearchQuery(''); }}>
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                            
                            {isSearching && (
                              <div className="flex items-center justify-center py-4">
                                <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                              </div>
                            )}
                            
                            {searchResults.length > 0 && (
                              <div className="grid grid-cols-4 gap-2 max-h-[150px] overflow-y-auto">
                                {searchResults.map((img, idx) => (
                                  <div 
                                    key={idx}
                                    onClick={() => handleSelectSearchResult(img)}
                                    className="relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 border-transparent hover:border-blue-500 transition-all group"
                                  >
                                    <img 
                                      src={img.thumbnail || img.url} 
                                      alt={img.title || 'Search result'} 
                                      className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                      <span className="text-white text-xs font-medium">Select</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    
                    <input
                      ref={endFrameInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, 'end')}
                    />
                  </div>
                )}

                {/* Driving Audio URL (LTX Audio-to-Video only) */}
                {currentModel.requiresAudioUrl && (
                  <div className="bg-white rounded-lg p-4 border border-purple-200 shadow-sm bg-purple-50/30">
                    <div className="flex items-center gap-2 mb-2">
                      <Volume2 className="w-5 h-5 text-purple-600" />
                      <h3 className="font-semibold text-gray-900">Driving Audio URL</h3>
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">Required</span>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">
                      Paste a public URL to an MP3 or WAV file. The video will be generated to match this audio.
                    </p>
                    <Input
                      value={drivingAudioUrl}
                      onChange={(e) => setDrivingAudioUrl(e.target.value)}
                      placeholder="https://example.com/my-audio.mp3"
                      className="bg-white"
                    />
                  </div>
                )}

                {/* Additional Reference Images (Veo 3.1 only) */}
                {currentModel.supportsMultipleImages && uploadedImage && (
                  <div className="bg-white rounded-lg p-4 border shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <ImageIcon className="w-5 h-5 text-green-600" />
                      <h3 className="font-semibold text-gray-900">Additional Reference Images</h3>
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Optional - Veo 3.1 Feature</span>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">
                      Add up to 4 more reference images to guide the video generation style and composition.
                    </p>
                    
                    {/* Show existing additional images */}
                    {additionalImages.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {additionalImages.map((img, index) => (
                          <div key={index} className="relative w-20 h-20">
                            <img 
                              src={img} 
                              alt={`Reference ${index + 1}`} 
                              className="w-full h-full object-cover rounded-lg border" 
                            />
                            <button 
                              onClick={() => removeAdditionalImage(index)}
                              className="absolute -top-1 -right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Add more buttons - only if under 4 images */}
                    {additionalImages.length < 4 && (
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = 'image/*';
                            input.onchange = (e) => handleFileUpload(e, 'additional');
                            input.click();
                          }}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Add Reference
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="flex-1"
                          onClick={() => { setLibraryTarget('additional'); setShowLibrary(true); }}
                        >
                          <FolderOpen className="w-4 h-4 mr-2" />
                          From Library
                        </Button>
                      </div>
                    )}
                    
                    <p className="text-xs text-gray-400 mt-2">
                      {additionalImages.length}/4 reference images added
                    </p>
                  </div>
                )}

                {/* Output Settings */}
                <div className="bg-white rounded-lg p-4 border shadow-sm">
                  <h3 className="font-semibold text-gray-900 mb-3">Output Settings</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">Aspect Ratio</label>
                      <select
                        value={aspectRatio}
                        onChange={(e) => setAspectRatio(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                      >
                        {currentModel.aspectRatios.map(ar => (
                          <option key={ar} value={ar}>{ASPECT_RATIO_LABELS[ar] || ar}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">Resolution</label>
                      <select
                        value={resolution}
                        onChange={(e) => setResolution(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                      >
                        {currentModel.resolutions.map(res => (
                          <option key={res} value={res}>{res}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">Duration</label>
                      <select
                        value={duration}
                        onChange={(e) => setDuration(parseInt(e.target.value))}
                        className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                      >
                        {currentModel.durationOptions.map(d => (
                          <option key={d} value={d}>{d} seconds</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Model Features — only shown when the selected model has toggleable features */}
                {(currentModel.supportsAudio || currentModel.supportsCameraFixed || currentModel.supportsNegativePrompt || currentModel.supportsCfgScale) && (
                  <div className="bg-white rounded-lg p-4 border shadow-sm space-y-3">
                    <h3 className="font-semibold text-gray-900">Model Features</h3>

                    {/* Audio toggle */}
                    {currentModel.supportsAudio && (
                      <div className="flex items-center justify-between py-1">
                        <div className="flex items-center gap-2">
                          {enableAudio ? <Volume2 className="w-4 h-4 text-[#2C666E]" /> : <VolumeX className="w-4 h-4 text-gray-400" />}
                          <span className="text-sm text-gray-700">Generate Audio</span>
                        </div>
                        <button
                          onClick={() => setEnableAudio(!enableAudio)}
                          className={`relative w-11 h-6 rounded-full transition-colors ${enableAudio ? 'bg-[#2C666E]' : 'bg-gray-300'}`}
                        >
                          <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${enableAudio ? 'left-6' : 'left-1'}`} />
                        </button>
                      </div>
                    )}

                    {/* Camera Fixed toggle */}
                    {currentModel.supportsCameraFixed && (
                      <div className="flex items-center justify-between py-1">
                        <div className="flex items-center gap-2">
                          <Lock className={`w-4 h-4 ${cameraFixed ? 'text-blue-600' : 'text-gray-400'}`} />
                          <span className="text-sm text-gray-700">Lock Camera Position</span>
                        </div>
                        <button
                          onClick={() => setCameraFixed(!cameraFixed)}
                          className={`relative w-11 h-6 rounded-full transition-colors ${cameraFixed ? 'bg-blue-600' : 'bg-gray-300'}`}
                        >
                          <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${cameraFixed ? 'left-6' : 'left-1'}`} />
                        </button>
                      </div>
                    )}

                    {/* Negative Prompt */}
                    {currentModel.supportsNegativePrompt && (
                      <div>
                        <label className="text-xs font-medium text-gray-500 mb-1 block">Negative Prompt (optional)</label>
                        <input
                          value={negativePrompt}
                          onChange={(e) => setNegativePrompt(e.target.value)}
                          placeholder="blurry, low quality, distorted..."
                          className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                        />
                      </div>
                    )}

                    {/* CFG Scale */}
                    {currentModel.supportsCfgScale && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-medium text-gray-500">Prompt Adherence (CFG)</label>
                          <span className="text-xs font-medium text-amber-600">{cfgScale.toFixed(2)}</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={cfgScale}
                          onChange={(e) => setCfgScale(parseFloat(e.target.value))}
                          className="w-full accent-amber-500"
                        />
                        <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                          <span>Creative</span>
                          <span>Balanced</span>
                          <span>Precise</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Video Settings */}
            {currentStep === 2 && (
              <div className="max-w-4xl mx-auto space-y-4">
                {/* Preview uploaded image */}
                {uploadedImage && (
                  <div className="bg-white rounded-lg p-4 border shadow-sm">
                    <div className="flex items-center gap-4">
                      <img src={uploadedImage} alt="Start" className="w-24 h-24 object-cover rounded-lg border" />
                      {endFrameImage && (
                        <>
                          <ArrowRight className="w-5 h-5 text-gray-400" />
                          <img src={endFrameImage} alt="End" className="w-24 h-24 object-cover rounded-lg border" />
                        </>
                      )}
                      <div className="flex-1 text-sm text-gray-600">
                        <p><strong>Model:</strong> {currentModel.label}</p>
                        <p><strong>Output:</strong> {ASPECT_RATIO_LABELS[aspectRatio] || aspectRatio} @ {resolution}</p>
                        <p><strong>Duration:</strong> {duration} seconds</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Scene Description */}
                <div className="bg-gradient-to-r from-[#2C666E]/10 to-[#90DDF0]/10 rounded-lg p-4 border-2 border-[#2C666E]/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Video className="w-5 h-5 text-[#2C666E]" />
                    <h3 className="font-semibold text-gray-900">Scene Description</h3>
                    <span className="text-xs text-[#2C666E] font-medium bg-[#2C666E]/10 px-2 py-0.5 rounded">Important!</span>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">Describe the action, movement, and what happens in the video. Add human elements for natural feel.</p>
                  <textarea 
                    value={sceneDescription} 
                    onChange={(e) => setSceneDescription(e.target.value)} 
                    placeholder="e.g., 'A person smiles warmly and talks naturally to the camera, making gentle hand gestures, with occasional soft blinks and natural head movements...'"
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white resize-none h-24" 
                  />
                  
                  {/* Quick Add Ideas */}
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-gray-500 font-medium">Quick Add:</p>
                      {[
                        { id: 'all', label: 'All' },
                        { id: 'person', label: '🎭 Person' },
                        { id: 'object', label: '📦 Object' },
                        { id: 'scene', label: '🌿 Scene' },
                      ].map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => setSceneIdeaFilter(tab.id)}
                          className={`px-2 py-0.5 text-xs rounded-full border transition-colors ${
                            sceneIdeaFilter === tab.id
                              ? 'bg-[#2C666E] text-white border-[#2C666E]'
                              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1">
                      {SCENE_IDEAS
                        .filter(idea => sceneIdeaFilter === 'all' || idea.category === sceneIdeaFilter)
                        .map(idea => (
                        <button
                          key={idea.label}
                          onClick={() => setSceneDescription(prev => prev ? `${prev}, ${idea.value}` : idea.value)}
                          className="px-2 py-1 text-xs rounded-full bg-white border border-[#2C666E]/30 hover:bg-[#90DDF0]/30 hover:border-[#2C666E] transition-all"
                        >
                          + {idea.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {sceneDescription && (
                    <button 
                      onClick={() => setSceneDescription('')}
                      className="mt-2 text-xs text-gray-500 hover:text-red-500 transition-colors"
                    >
                      ✕ Clear description
                    </button>
                  )}
                </div>

                {/* Audio Transcript (only when audio is enabled) */}
                {currentModel.supportsAudio && enableAudio && (
                  <div className="bg-white rounded-lg p-4 border shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <Volume2 className="w-5 h-5 text-[#2C666E]" />
                      <h3 className="font-semibold text-gray-900">Speech / Dialogue</h3>
                      <span className="text-xs text-gray-400">(optional)</span>
                    </div>
                    <textarea
                      value={audioTranscript}
                      onChange={(e) => setAudioTranscript(e.target.value)}
                      placeholder="e.g., 'Hi everyone! Let me show you this amazing product...'"
                      className="w-full px-3 py-2 border rounded-lg text-sm bg-white resize-none h-16"
                    />
                    <p className="text-xs text-gray-400 mt-1">Leave empty for ambient sounds based on the scene.</p>
                  </div>
                )}

                {/* Video Style */}
                <div className="bg-white rounded-lg p-4 border shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Camera className="w-5 h-5 text-[#2C666E]" />
                    <h3 className="font-semibold text-gray-900">Video Style</h3>
                  </div>
                  <select value={videoStyle} onChange={(e) => setVideoStyle(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm bg-white">
                    {VIDEO_STYLES.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Camera Movement & Angle */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-lg p-4 border shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <Move className="w-5 h-5 text-[#2C666E]" />
                      <h3 className="font-semibold text-gray-900">Camera Movement</h3>
                    </div>
                    <select value={cameraMovement} onChange={(e) => setCameraMovement(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm bg-white">
                      {CAMERA_MOVEMENTS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 border shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <Camera className="w-5 h-5 text-[#2C666E]" />
                      <h3 className="font-semibold text-gray-900">Camera Angle</h3>
                    </div>
                    <select value={cameraAngle} onChange={(e) => setCameraAngle(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm bg-white">
                      {CAMERA_ANGLES.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Special Effects with Combos */}
                <div className="bg-white rounded-lg p-4 border shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-5 h-5 text-[#2C666E]" />
                    <h3 className="font-semibold text-gray-900">Special Effects</h3>
                    <span className="text-xs text-gray-400">(multi-select)</span>
                  </div>
                  
                  {/* Quick Combo Presets */}
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-2">🎯 Quick Combos:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {EFFECT_COMBOS.map(combo => (
                        <button
                          key={combo.id}
                          onClick={() => setSpecialEffects(combo.effects)}
                          className={`px-2 py-1 text-xs rounded-full border transition-all ${
                            JSON.stringify(specialEffects.sort()) === JSON.stringify(combo.effects.sort())
                              ? 'bg-[#2C666E] text-white border-[#2C666E]'
                              : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-[#90DDF0]/20'
                          }`}
                        >
                          {combo.label}
                        </button>
                      ))}
                      {specialEffects.length > 0 && (
                        <button
                          onClick={() => setSpecialEffects([])}
                          className="px-2 py-1 text-xs rounded-full border border-red-200 text-red-600 hover:bg-red-50"
                        >
                          ✕ Clear
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Individual Effects by Category */}
                  <div className="space-y-2 max-h-40 overflow-y-auto border rounded-lg p-2 bg-gray-50">
                    {['realistic', 'light', 'film', 'particles', 'nature'].map(category => (
                      <div key={category}>
                        <p className="text-xs font-medium text-gray-500 capitalize mb-1">
                          {category === 'realistic' ? '🤳 Realistic' : 
                           category === 'light' ? '💡 Light' :
                           category === 'film' ? '🎬 Film' :
                           category === 'particles' ? '✨ Particles' : '🌿 Nature'}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {SPECIAL_EFFECTS.filter(e => e.category === category).map(effect => (
                            <button
                              key={effect.value}
                              onClick={() => {
                                setSpecialEffects(prev => 
                                  prev.includes(effect.value) 
                                    ? prev.filter(e => e !== effect.value)
                                    : [...prev, effect.value]
                                );
                              }}
                              className={`px-1.5 py-0.5 text-xs rounded border transition-all ${
                                specialEffects.includes(effect.value)
                                  ? 'bg-[#2C666E] text-white border-[#2C666E]'
                                  : 'bg-white text-gray-600 border-gray-200 hover:bg-[#90DDF0]/20'
                              }`}
                            >
                              {effect.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {specialEffects.length > 0 && (
                    <div className="mt-2 text-xs text-[#07393C]">
                      <strong>Selected ({specialEffects.length}):</strong> {specialEffects.join(', ')}
                    </div>
                  )}
                </div>

                {/* Description & Motion Presets */}
                <div className="bg-white rounded-lg p-4 border shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Video className="w-5 h-5 text-[#2C666E]" />
                    <h3 className="font-semibold text-gray-900">Description & Motion</h3>
                    <span className="text-xs text-gray-400">(optional)</span>
                  </div>
                  
                  {/* Prefilled Preset Buttons */}
                  <div className="mb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-xs text-gray-500 font-medium">Quick Presets:</p>
                      {[
                        { id: 'all', label: 'All' },
                        { id: 'person', label: '🎭 Person' },
                        { id: 'object', label: '📦 Product' },
                        { id: 'scene', label: '🌿 Scene' },
                      ].map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => setPresetFilter(tab.id)}
                          className={`px-2 py-0.5 text-xs rounded-full border transition-colors ${
                            presetFilter === tab.id
                              ? 'bg-[#2C666E] text-white border-[#2C666E]'
                              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {DESCRIPTION_PRESETS
                        .filter(preset => presetFilter === 'all' || preset.category === presetFilter)
                        .map(preset => (
                        <button
                          key={preset.id}
                          onClick={() => setDescription(preset.prompt)}
                          className={`px-2 py-1 text-xs rounded-full border transition-all ${
                            description === preset.prompt
                              ? 'bg-[#2C666E] text-white border-[#2C666E]'
                              : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-[#90DDF0]/20'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <textarea 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)} 
                    placeholder="Add custom motion/style details... (e.g., 'real person, genuine emotion, natural lighting, unfiltered')" 
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white resize-none h-16" 
                  />
                  
                  {description && (
                    <button 
                      onClick={() => setDescription('')}
                      className="mt-2 text-xs text-gray-500 hover:text-red-500 transition-colors"
                    >
                      ✕ Clear description
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Preview */}
            {currentStep === 3 && generatedVideoUrl && (
              <div className="max-w-4xl mx-auto space-y-4">
                <div className="bg-white rounded-lg p-4 border shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <Play className="w-5 h-5 text-[#2C666E]" />
                    <h3 className="font-semibold text-gray-900">Generated Video</h3>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded ml-auto">✓ Complete</span>
                  </div>
                  <div className="relative flex items-center justify-center bg-black rounded-lg overflow-hidden" style={{ maxHeight: '50vh' }}>
                    <video 
                      src={generatedVideoUrl} 
                      controls 
                      autoPlay 
                      loop 
                      className="max-w-full max-h-[50vh] rounded-lg"
                    />
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <Button onClick={handleDownloadVideo} className="flex-1 bg-[#2C666E] hover:bg-[#07393C]">
                    <Download className="w-4 h-4 mr-2" />
                    Download to Device
                  </Button>
                  {onVideoGenerated && (
                    <Button 
                      onClick={handleAddToEditor} 
                      variant="outline" 
                      className="flex-1"
                      disabled={hasAddedToEditor}
                    >
                      {hasAddedToEditor ? '✓ Added' : 'Add to Collection'}
                    </Button>
                  )}
                </div>
                
                <Button 
                  variant="outline" 
                  onClick={() => { setCurrentStep(1); setGeneratedVideoUrl(null); }}
                  className="w-full"
                >
                  Create Another Video
                </Button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 bg-white border-t flex items-center justify-between flex-shrink-0">
            <div>
              {currentStep > 1 && currentStep < 3 && (
                <Button variant="outline" onClick={() => setCurrentStep(prev => prev - 1)}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              {currentStep === 1 && (
                <Button 
                  onClick={() => setCurrentStep(2)} 
                  disabled={!uploadedImage || (currentModel.requiresFirstLastFrame && !endFrameImage)}
                  className="bg-[#2C666E] hover:bg-[#07393C] text-white"
                >
                  Next: Video Settings
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
              {currentStep === 2 && (
                <Button 
                  onClick={handleGenerateVideo}
                  className="bg-[#2C666E] hover:bg-[#07393C] text-white"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Video
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Loading Modal */}
      <LoadingModal isOpen={isLoading} message={loadingMessage || 'Generating video...'} />

      {/* Library Modal */}
      <LibraryModal
        isOpen={showLibrary}
        onClose={() => setShowLibrary(false)}
        onSelect={handleLibrarySelect}
        mediaType="images"
      />
    </>
  );
}
