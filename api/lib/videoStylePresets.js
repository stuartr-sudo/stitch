/**
 * Video Style Presets — controls animation/motion feel.
 * Appended to the motion prompt when generating image-to-video clips.
 */

export const VIDEO_STYLE_PRESETS = {
  iphone_selfie: {
    label: 'iPhone Selfie (Raw)',
    category: 'realistic',
    description: 'Handheld smartphone footage, natural room lighting, raw unfiltered look',
    thumb: 'https://v3b.fal.media/files/b/0a931548/4aPyLtiRJ_nJXIB4BOIBW.jpg',
    prompt: 'raw iPhone 15 front-facing camera footage, handheld smartphone video with subtle micro-shake, natural ambient room lighting with soft window light on face, visible skin pores and texture, slight lens distortion at edges, authentic unfiltered color profile, relaxed genuine expression, casual everyday clothing with real fabric wrinkles',
  },
  ugc_testimonial: {
    label: 'UGC Testimonial',
    category: 'realistic',
    description: 'Person speaking to camera, soft ambient indoor lighting, authentic conversational feel',
    thumb: 'https://v3b.fal.media/files/b/0a931548/vwn7n5_DYC-SSyUw1VgJh.jpg',
    prompt: 'authentic user-generated testimonial video, real person speaking with natural speech cadence and breath pauses, subtle lip movements matching natural talking rhythm, genuine micro-expressions, real skin with natural imperfections and pores visible, soft ambient indoor lighting from overhead, believable casual setting with slight background depth, conversational eye contact',
  },
  tiktok_style: {
    label: 'TikTok/Reels Style',
    category: 'realistic',
    description: 'Energetic creator content, ring light, expressive and vibrant social media aesthetic',
    thumb: 'https://v3b.fal.media/files/b/0a931548/r_c0kdMzJCSQRI77cgy90.jpg',
    prompt: 'vertical social media content creator video, direct-to-camera engagement with expressive natural facial movements, quick authentic reactions, real skin texture under ring light or natural window light, slightly warm color temperature, genuine personality showing through micro-expressions, natural hand gestures entering frame, energetic but believable body language',
  },
  facetime_call: {
    label: 'FaceTime/Video Call',
    category: 'realistic',
    description: 'Webcam angle from above, screen glow on face, casual at-home video call look',
    thumb: 'https://v3b.fal.media/files/b/0a931548/7wBSi1OSB8-PnQTpnEkqp.jpg',
    prompt: 'video call aesthetic shot from laptop webcam angle, slightly above eye level, natural indoor ambient lighting mixing with screen glow on face, casual at-home appearance, real skin texture with slight webcam softness, authentic conversational micro-expressions, relaxed posture, genuine unperformed body language, slight compression artifacts for realism',
  },
  cinematic: {
    label: 'Cinematic',
    category: 'professional',
    description: 'Film-quality look with anamorphic lens, teal-orange grade, and shallow depth of field',
    thumb: 'https://v3b.fal.media/files/b/0a931548/822Q5nGf3Q2dCmwNQzE_b.jpg',
    prompt: 'cinematic film quality shot on Arri Alexa, anamorphic framing feel, professional three-point lighting with soft key light creating gentle shadow fall-off, shallow depth of field with creamy bokeh separation, natural skin tones with subtle color grading, film-like motion cadence at 24fps, atmospheric haze catching light, precise composition with leading lines',
  },
  documentary: {
    label: 'Documentary',
    category: 'professional',
    description: 'Handheld observational style, natural available light, muted journalistic tones',
    thumb: 'https://v3b.fal.media/files/b/0a931548/WOFDTOKaHt0L9UxR6wlkN.jpg',
    prompt: 'observational documentary style, handheld camera with natural stabilization, available light used authentically, candid unposed moments captured naturally, real environments with lived-in detail, natural skin tones without color grading, genuine emotional moments, ambient sound atmosphere, journalistic truthful aesthetic',
  },
  commercial: {
    label: 'Commercial/Ad',
    category: 'professional',
    description: 'Polished studio production, warm aspirational palette, premium clean composition',
    thumb: 'https://v3b.fal.media/files/b/0a931548/l-kPVFH0nkYpT7v2yZAah.jpg',
    prompt: 'high-end commercial production quality, precisely controlled studio lighting with soft diffusion, product and subject both in sharp focus, polished but natural-looking skin, aspirational warm color palette, smooth controlled camera movement, clean composition with visual breathing room, professional wardrobe and styling, premium feel',
  },
  product_demo: {
    label: 'Product Demo',
    category: 'professional',
    description: 'Clean product on neutral background, even studio lighting, sharp detail-focused framing',
    thumb: 'https://v3b.fal.media/files/b/0a931549/b_nvyKFhMTJekyrAo5yK1.jpg',
    prompt: 'clean professional product demonstration, neutral background with soft gradient, even studio lighting revealing surface texture and material quality, smooth deliberate product handling with natural hand movements, clear visual focus on product features, slight reflection on surface below, precise framing with product as hero',
  },
  dreamy: {
    label: 'Dreamy/Ethereal',
    category: 'artistic',
    description: 'Soft diffusion glow, pastel palette, golden bokeh, and romantic overexposed highlights',
    thumb: 'https://v3b.fal.media/files/b/0a931549/rO3udTKiuzVwD_CO3DCBc.jpg',
    prompt: 'ethereal dreamlike quality with soft diffusion filter effect, gentle overexposed highlights wrapping around subject, pastel and desaturated color palette, slow graceful movement, subtle lens glow on light sources, delicate bokeh orbs in background, romantic golden or blue hour natural light, flowing fabric or hair movement suggesting gentle breeze',
  },
  vintage: {
    label: 'Vintage/Retro',
    category: 'artistic',
    description: '16mm film grain, warm amber tones, vignette edges, and lifted nostalgic blacks',
    thumb: 'https://v3b.fal.media/files/b/0a931549/yl-LFzXU8X1B4tPokgQB0.jpg',
    prompt: 'authentic vintage 16mm film aesthetic, warm amber color shift with faded blacks lifted to milky grey, organic film grain texture visible on skin and surfaces, slight vignette darkening at frame edges, period-appropriate soft focus quality, gentle gate weave and frame instability, nostalgic halation around bright highlights',
  },
  noir: {
    label: 'Film Noir',
    category: 'artistic',
    description: 'High contrast chiaroscuro, dramatic shadows, venetian blind patterns, atmospheric smoke',
    thumb: 'https://v3b.fal.media/files/b/0a931549/GNvgxVWjhFc0ZXHtddWii.jpg',
    prompt: 'classic film noir cinematography, high contrast chiaroscuro lighting with deep blacks and bright specular highlights, dramatic single key light source creating long shadows, venetian blind shadow patterns, smoke or atmospheric haze catching light beams, moody monochromatic or desaturated cool palette, low-key lighting revealing only essential details',
  },
  anime: {
    label: 'Anime Style',
    category: 'artistic',
    description: 'Vibrant cel-shaded animation, expressive characters, detailed backgrounds, dynamic angles',
    thumb: 'https://v3b.fal.media/files/b/0a931549/gVmrP3xeHjdNrp3T2qOHk.jpg',
    prompt: 'high-quality anime art style animation, vibrant saturated color palette, expressive character animation with fluid motion, dynamic speed lines and impact frames, detailed background art with atmospheric perspective, cel-shaded lighting with crisp shadow edges, wind-blown hair and clothing movement, dramatic camera angles',
  },
  faceless_cinematic: {
    label: 'Faceless Cinematic',
    category: 'faceless',
    description: 'No people — dramatic landscapes, objects, and environments with cinematic framing',
    prompt: 'cinematic establishing shots without any people or faces, sweeping landscape and environment cinematography, dramatic lighting with volumetric rays, slow controlled camera movement, atmospheric depth and haze, professional color grading with rich contrast, detailed textures on surfaces and materials, no human figures visible',
  },
  faceless_tech: {
    label: 'Faceless Tech',
    category: 'faceless',
    description: 'No people — screens, circuits, data visualizations, and futuristic tech imagery',
    prompt: 'technology-focused visuals without any people or faces, glowing screens and holographic displays, circuit boards and server rooms, data visualization and flowing code, cool blue and neon accent lighting, clean modern environments, close-up macro shots of tech components, futuristic laboratory aesthetic',
  },
  faceless_nature: {
    label: 'Faceless Nature',
    category: 'faceless',
    description: 'No people — stunning nature footage, macro details, aerial landscapes',
    prompt: 'breathtaking nature cinematography without any people or faces, macro close-ups of natural textures and organisms, aerial drone establishing shots, golden hour and blue hour lighting, time-lapse quality cloud and water movement, rich saturated earthy color palette, intimate botanical and geological details',
  },
  faceless_abstract: {
    label: 'Faceless Abstract',
    category: 'faceless',
    description: 'No people — abstract shapes, particles, gradients, and motion graphics feel',
    prompt: 'abstract visual art without any people or faces, flowing particle systems and geometric shapes, smooth gradient color transitions, organic fluid simulations, light trails and bokeh orbs, minimalist composition with negative space, ethereal atmospheric glow effects, hypnotic repeating patterns',
  },
  faceless_dark: {
    label: 'Faceless Dark/Horror',
    category: 'faceless',
    description: 'No people — eerie environments, shadows, abandoned spaces, atmospheric dread',
    prompt: 'dark atmospheric visuals without any people or faces, abandoned spaces and decaying architecture, deep shadows with minimal light sources, fog and mist obscuring details, desaturated cold color palette, subtle movement in darkness, eerie environmental textures, oppressive low-key lighting creating sense of dread',
  },
  motion_graphics: {
    label: 'Motion Graphics',
    category: 'faceless',
    description: 'No people — infographic-style with bold shapes, icons, and kinetic typography feel',
    prompt: 'clean motion graphics style without any people or faces, bold geometric shapes and flat design elements, smooth kinetic transitions between scenes, infographic-inspired data presentation, vibrant contrasting color blocks, isometric perspective illustrations, minimalist icons and symbols, professional broadcast quality',
  },
  stock_footage: {
    label: 'Stock B-Roll',
    category: 'faceless',
    description: 'No people — generic professional B-roll style, versatile and clean',
    prompt: 'professional stock footage style without any people or faces, clean well-lit environments, versatile generic scenes suitable for voiceover, smooth stabilized camera movement, neutral color grading, offices desks and workspaces, city skylines and traffic, everyday objects and environments shot professionally',
  },
};

export function getVideoStylePrompt(key) {
  if (!key || !VIDEO_STYLE_PRESETS[key]) return '';
  return VIDEO_STYLE_PRESETS[key].prompt;
}

export function listVideoStyles() {
  return Object.entries(VIDEO_STYLE_PRESETS).map(([key, v]) => ({
    key,
    label: v.label,
    category: v.category,
    thumb: v.thumb || '',
    description: v.description || '',
  }));
}
