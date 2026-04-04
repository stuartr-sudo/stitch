/**
 * Built-in Prompt Templates
 *
 * 15 templates across 3 categories (Cinematic, Product, Character).
 * These are not stored in the DB — they're client-side constants
 * that can be passed to the prompt builder like any user template.
 *
 * Each template has:
 *   id, name, category, model_family,
 *   sections: { camera, subject, environment, motion, style },
 *   variables: string[]   — placeholder names the user can fill in
 */

// ---------------------------------------------------------------------------
// Cinematic (video generation)
// ---------------------------------------------------------------------------

const CINEMATIC_TEMPLATES = [
  {
    id: 'builtin-cinematic-product-hero',
    name: 'Cinematic Product Hero',
    category: 'cinematic',
    model_family: 'all',
    sections: {
      camera:
        'Slow cinematic dolly push-in starting from a wide establishing angle, gradually tightening to a medium close-up that fills two-thirds of the frame. Shallow depth of field with creamy bokeh separating the product from the background. Subtle parallax shift to add dimensionality.',
      subject:
        '{{product}} positioned as the undisputed hero of the frame, lit with a sculpted three-point lighting setup — warm key light from camera-left, cool fill from the right, and a tight hair light rimming the edges. Surface textures are rendered with micro-detail: reflections, grain, and material sheen all visible.',
      environment:
        'Minimalist set with a polished dark surface that catches soft reflections. Background falls off into a smooth gradient of deep charcoal to near-black, punctuated by a faint atmospheric haze that adds depth without distraction.',
      motion:
        'Product rotates imperceptibly slow on its axis — roughly five degrees over the full clip duration — while ambient light particles drift lazily through the mid-ground. A gentle volumetric light shaft sweeps across from left to right.',
      style:
        'Premium commercial aesthetic reminiscent of luxury automotive and fragrance advertising. Rich contrast, restrained color grading leaning into warm golds and cool silvers, with meticulously controlled specular highlights.',
    },
    variables: ['product'],
  },
  {
    id: 'builtin-cinematic-epic-landscape',
    name: 'Epic Landscape',
    category: 'cinematic',
    model_family: 'all',
    sections: {
      camera:
        'Sweeping aerial crane shot beginning high above the terrain, descending gradually toward ground level as the camera tracks forward. Ultra-wide 14mm perspective exaggerates the scale of the environment. Horizon line sits in the upper third for dramatic foreground emphasis.',
      subject:
        '{{landscape_type}} stretching to the horizon with layered depth planes — immediate foreground texture, mid-ground features, and distant atmospheric perspective. Natural elements convey immense scale: tiny trees, winding rivers, or geological formations that dwarf any human presence.',
      environment:
        'Golden hour lighting with the sun positioned just above the horizon line, casting long dramatic shadows and painting every surface in warm amber and deep violet. Clouds form a textured ceiling with god-rays piercing through gaps, creating pools of directed light across the landscape.',
      motion:
        'Wind ripples across vegetation in progressive waves from background to foreground. Clouds drift at visible speed overhead, casting moving shadow patterns. Dust or mist particles catch the light in the mid-ground, creating a living, breathing atmosphere.',
      style:
        'Nature documentary grandeur with the color depth of large-format landscape photography. Extended dynamic range preserving detail in both the brightest highlights and deepest shadows. Teal-and-orange complementary palette in the atmospheric haze.',
    },
    variables: ['landscape_type'],
  },
  {
    id: 'builtin-cinematic-moody-portrait',
    name: 'Moody Portrait',
    category: 'cinematic',
    model_family: 'all',
    sections: {
      camera:
        'Tight medium close-up framed from chest to just above the crown, shot on an 85mm equivalent with f/1.4 aperture for extreme background separation. Camera holds nearly static with only a barely perceptible drift to the left, creating an intimate, voyeuristic tension.',
      subject:
        '{{character}} captured in a contemplative moment, gaze directed slightly off-camera into the middle distance. Face lit by a single motivated light source — a window, a screen glow, or a practical lamp — leaving half the face in rich, detailed shadow. Skin texture rendered with photographic honesty.',
      environment:
        'Interior space with muted, lived-in tones — dark wood, worn fabric, soft ambient clutter. The background is thrown completely out of focus, reduced to abstract shapes and warm color blobs. A faint edge of a doorframe or bookshelf anchors the spatial context.',
      motion:
        'Near-stillness: only the subtle rise and fall of breathing, a slow blink, and the faintest micro-expression shift around the eyes and mouth. Ambient dust motes float through the single light beam. Background bokeh orbs pulse gently.',
      style:
        'Intimate character study with the tonal range of Rembrandt portraiture translated into a modern photographic idiom. Muted warm palette with desaturated midtones and rich blacks. Film-grain texture adds tactile warmth without digital noise artifacts.',
    },
    variables: ['character'],
  },
  {
    id: 'builtin-cinematic-action-sequence',
    name: 'Action Sequence',
    category: 'cinematic',
    model_family: 'all',
    sections: {
      camera:
        'Dynamic tracking shot following the action at matched velocity, combining a lateral dolly with a slight handheld shake for visceral energy. Alternates between low-angle hero framing and eye-level pursuit perspective. Shutter speed set to 180 degrees for natural motion blur on fast movements.',
      subject:
        '{{character}} in peak physical motion — running, leaping, or striking — with every muscle group engaged and visible through fitted clothing or exposed skin. Hair and fabric respond authentically to wind resistance and momentum. Expression conveys focused determination.',
      environment:
        'Urban industrial setting with layered depth — foreground debris, mid-ground structures, and distant cityscape. Wet asphalt reflects overhead light sources creating streaky reflections. Scattered practical lights from street lamps and neon signs paint colorful accents across surfaces.',
      motion:
        'High-energy kinetic sequence: the primary subject moves through the frame at speed while environmental elements react — papers scatter, puddles splash, jacket billows. Background elements streak with parallax motion blur. Sparks or particulate matter trail through the air.',
      style:
        'High-octane action cinema with the controlled chaos of a precision-choreographed stunt sequence. Desaturated base palette with selective color pops on key light sources. Aggressive contrast with crushed blacks and blown specular highlights for graphic impact.',
    },
    variables: ['character'],
  },
  {
    id: 'builtin-cinematic-establishing-shot',
    name: 'Establishing Shot',
    category: 'cinematic',
    model_family: 'all',
    sections: {
      camera:
        'Ultra-wide establishing shot on a 16mm lens, slowly panning right-to-left across the full scene. Camera positioned at a slightly elevated three-quarter angle to reveal both the horizontal expanse and vertical layering of the environment. Steady, controlled movement with no perceptible jitter.',
      subject:
        '{{location}} presented in its full architectural or geographical context, with clear spatial relationships between major elements. Scale indicators — people, vehicles, or familiar objects — are placed strategically to communicate the true size of the environment.',
      environment:
        'Rich environmental storytelling through time-of-day lighting, weather conditions, and atmospheric density. Every surface carries texture and aging detail appropriate to the setting. Foreground framing elements — branches, architecture, or terrain — create a natural vignette drawing the eye inward.',
      motion:
        'The environment itself is alive: flags ripple on poles, distant traffic flows along roads, birds cross the sky in loose formations. Clouds migrate across the frame casting moving shadow patterns. Trees sway in unison suggesting a persistent breeze direction.',
      style:
        'Cinematic location photography with the scope and grandeur of a wide-format IMAX frame. Color grading tailored to the setting — warm and inviting for welcoming locations, cool and desaturated for ominous ones. Atmospheric perspective adds natural depth fog to distant planes.',
    },
    variables: ['location'],
  },
];

// ---------------------------------------------------------------------------
// Product (product photography)
// ---------------------------------------------------------------------------

const PRODUCT_TEMPLATES = [
  {
    id: 'builtin-product-clean-studio',
    name: 'Clean Studio',
    category: 'product',
    model_family: 'all',
    sections: {
      camera:
        'Straight-on product shot at eye level with the item centered in frame. 90mm macro lens at f/8 for edge-to-edge sharpness across the entire product surface. Perfectly level horizon with geometric precision and symmetrical framing.',
      subject:
        '{{product}} placed on a seamless infinity curve, every surface detail rendered with clinical precision. Labels, textures, and material finishes are legible and accurate. The product occupies approximately sixty percent of the frame for comfortable breathing room.',
      environment:
        'Pure white seamless background with zero visible horizon line or corner shadows. Soft gradient from bright white behind the product to slightly warmer white at the base. No environmental distractions — the product exists in a pristine void.',
      motion:
        'Completely static — a frozen moment of perfect product presentation. No movement, no particles, no atmospheric effects. If video, the camera holds rock-steady for the full duration with no drift.',
      style:
        'E-commerce and catalog photography at its most polished. Even, wraparound soft-box lighting eliminates harsh shadows while preserving enough contrast to define edges and contours. Neutral white balance, zero color cast, and true-to-life material rendering.',
    },
    variables: ['product'],
  },
  {
    id: 'builtin-product-lifestyle-context',
    name: 'Lifestyle Context',
    category: 'product',
    model_family: 'all',
    sections: {
      camera:
        'Three-quarter overhead angle at approximately 35 degrees, shot on a 50mm lens with moderate depth of field. The product is positioned using rule-of-thirds placement, leaving room for contextual lifestyle elements to tell the usage story.',
      subject:
        '{{product}} shown in its natural use environment, surrounded by carefully curated complementary objects that suggest the lifestyle and moment of use. The product remains the sharpest element in the frame while context items fall into a gentle soft focus.',
      environment:
        '{{setting}} with warm, natural light streaming in from a window source. Surfaces carry authentic texture — linen, marble, wood grain, or concrete — that communicate quality and taste. Color palette of the environment complements and elevates the product colors.',
      motion:
        'Subtle signs of life: steam rising from a cup, a page mid-turn, fabric settling after being placed. These micro-animations suggest someone just stepped away, creating a narrative beat of paused activity.',
      style:
        'Editorial lifestyle photography from a premium shelter magazine. Warm, approachable color grading with lifted shadows and soft highlight rolloff. Natural light feel even when supplemented, avoiding any sterile or artificial quality.',
    },
    variables: ['product', 'setting'],
  },
  {
    id: 'builtin-product-macro-detail',
    name: 'Macro Detail',
    category: 'product',
    model_family: 'all',
    sections: {
      camera:
        'Extreme macro close-up at 1:1 magnification or higher, focusing on a specific material detail or texture zone of the product. Paper-thin depth of field with only a few millimeters in sharp focus, the rest falling into an abstract blur of color and form.',
      subject:
        'A defining detail of {{product}} — the weave of a fabric, the grain of leather, the brushed finish on metal, the facets of a crystal, or the printed label typography. This micro-view reveals craftsmanship and material quality invisible at normal viewing distance.',
      environment:
        'Background is pure abstract bokeh derived from the product itself and its immediate surroundings. No identifiable environmental context — the viewer is immersed entirely in the material world of the product at microscopic scale.',
      motion:
        'Extremely slow rack focus pulling from one texture plane to another, revealing layered depth within the product surface. Alternatively, a glacial lateral slide of one centimeter total distance, revealing new facets of the surface texture.',
      style:
        'Material science meets luxury advertising. Hyper-detailed rendering where every fiber, scratch, and reflection is resolved. Rich, saturated color with deep contrast to make textures pop. Studio-controlled specular highlights define three-dimensionality.',
    },
    variables: ['product'],
  },
  {
    id: 'builtin-product-flat-lay',
    name: 'Flat Lay',
    category: 'product',
    model_family: 'all',
    sections: {
      camera:
        'Perfect top-down bird\'s-eye view at exactly 90 degrees, shot with a medium-wide lens to minimize barrel distortion. Frame fills the entire composition surface edge-to-edge. Focus set to infinity equivalent for uniform sharpness across the flat plane.',
      subject:
        '{{product}} as the centerpiece of a carefully arranged flat-lay composition, surrounded by {{accessories}} placed with intentional asymmetric balance. Items are arranged on an invisible grid with consistent spacing, each rotated at deliberate angles to create visual rhythm.',
      environment:
        'Single-material surface — marble slab, raw linen, aged wood, or matte concrete — providing a unified textural canvas. The surface color is neutral or complementary to the product palette. No visible edges of the surface — it extends past the frame on all sides.',
      motion:
        'Static overhead composition. If animated, a single item enters the frame from one edge and is placed precisely into its designated position by an unseen hand, completing the arrangement.',
      style:
        'Instagram-native editorial flat lay with the precision of a graphic design composition. Even overhead lighting from a large diffused source eliminates directional shadows. Clean, bright exposure with true whites and accurate color reproduction across all materials.',
    },
    variables: ['product', 'accessories'],
  },
  {
    id: 'builtin-product-in-use-demo',
    name: 'In-Use Demo',
    category: 'product',
    model_family: 'all',
    sections: {
      camera:
        'Over-the-shoulder or first-person perspective showing hands interacting with the product. 35mm lens at f/2.8 keeps the product and hands sharp while blurring the surrounding environment. Slightly dynamic handheld feel with stabilization for smooth but human movement.',
      subject:
        '{{product}} being actively used by {{person}} — hands gripping, pressing, pouring, applying, or assembling. The interaction demonstrates the primary use case clearly and intuitively. Product branding and key features face the camera naturally during use.',
      environment:
        'Authentic use-case environment — kitchen, workshop, office desk, vanity, or outdoor setting. Background is contextually appropriate but softened to keep attention on the product interaction. Warm, motivated lighting from natural or practical sources.',
      motion:
        'Fluid demonstration of the product\'s primary function: a lid being opened, a button being pressed, liquid being poured, a tool being applied. The motion is slightly slower than real-time to emphasize precision and satisfying tactile feedback.',
      style:
        'Tutorial-meets-commercial aesthetic blending instructional clarity with aspirational production value. Warm, inviting color temperature with a slight vignette drawing focus to the center action. Skin tones are flattering and natural.',
    },
    variables: ['product', 'person'],
  },
];

// ---------------------------------------------------------------------------
// Character (character generation)
// ---------------------------------------------------------------------------

const CHARACTER_TEMPLATES = [
  {
    id: 'builtin-character-full-body-ref',
    name: 'Full Body Reference',
    category: 'character',
    model_family: 'all',
    sections: {
      camera:
        'Full body shot framed from head to feet with comfortable padding above and below. Camera positioned at waist height for neutral body proportions, avoiding the distortion of high or low angles. 85mm equivalent lens compresses perspective for flattering figure rendering.',
      subject:
        '{{character}} standing in a relaxed but confident neutral pose — weight slightly shifted to one leg, arms at sides with natural hand positioning. Full outfit visible from head to toe including footwear. Body proportions, build, and posture clearly defined. Face shows a calm, neutral expression with eyes directed at camera.',
      environment:
        'Clean neutral background — soft warm gray or desaturated blue-gray — with a subtle floor shadow grounding the character. No environmental props or distractions. A faint gradient darkening toward the edges creates gentle focus on the central figure.',
      motion:
        'Static reference pose with no movement. Character holds perfectly still as a living reference sheet. If video, camera remains locked with zero drift for the entire duration.',
      style:
        'Character design reference sheet quality — clear, well-lit, and unambiguous in every detail. Three-point studio lighting with soft key, subtle fill, and clean rim light separating the figure from the background. True-to-design color accuracy with no dramatic grading.',
    },
    variables: ['character'],
  },
  {
    id: 'builtin-character-portrait-closeup',
    name: 'Portrait Close-Up',
    category: 'character',
    model_family: 'all',
    sections: {
      camera:
        'Head-and-shoulders portrait framed from mid-chest to just above the crown. 105mm portrait lens at f/2.0 isolates the face from a smoothly defocused background. Camera at exact eye level for direct, confrontational intimacy. Slight tilt of two degrees adds subtle dynamism.',
      subject:
        '{{character}} with face fully visible and sharply rendered — every detail of skin texture, eye color, eyebrow shape, lip contour, and hair strand placement is resolved. Expression is {{expression}}, conveyed through specific muscle group engagement around the eyes, mouth, and brow.',
      environment:
        'Minimally suggested background — a color wash or abstract texture that complements the character\'s palette without competing. The environment is not identifiable as a specific location, serving purely as a tonal backdrop for the portrait.',
      motion:
        'Near-stillness with only micro-expressions: a slow blink, the faintest smile forming, a slight head tilt. Eyes remain engaged with the camera throughout. Hair responds to a gentle unseen breeze for organic movement.',
      style:
        'High-fashion editorial portraiture with the precision of beauty photography. Butterfly or loop lighting pattern sculpts facial structure. Catchlights in both eyes are perfectly positioned. Skin rendering is detailed but flattering — pores visible without emphasis on blemishes.',
    },
    variables: ['character', 'expression'],
  },
  {
    id: 'builtin-character-action-pose',
    name: 'Action Pose',
    category: 'character',
    model_family: 'all',
    sections: {
      camera:
        'Dynamic low-angle shot from approximately 15 degrees below eye level, emphasizing power and presence. Wide-angle 24mm lens exaggerates the nearest limb for dramatic foreshortening. Camera tilted 5 degrees into a dutch angle for kinetic energy. Fast shutter freezes peak action.',
      subject:
        '{{character}} captured at the peak moment of {{action}} — the split second of maximum extension, impact, or explosive movement. Every physical detail communicates force: tensed muscles, spread fingers, airborne hair, billowing clothing. Weight distribution and body mechanics are anatomically convincing.',
      environment:
        'Action-appropriate setting with environmental response to the character\'s movement — dust kicked up from the ground, air displacement rippling nearby objects, scattered debris, or splashing water. Background has directional motion blur suggesting the speed of the scene.',
      motion:
        'Peak-action freeze frame with implied momentum. All secondary elements — hair, cape, loose clothing, particles — stream in the direction of movement. The frame before and after this moment are visible in the blur trails and particle trajectories.',
      style:
        'Comic book dynamism meets cinematic realism. High contrast with deep blacks and punchy highlights. Selective rim lighting outlines the character against a darker background. Color grading pushes complementary tones — warm on the character, cool in the environment.',
    },
    variables: ['character', 'action'],
  },
  {
    id: 'builtin-character-emotional-expression',
    name: 'Emotional Expression',
    category: 'character',
    model_family: 'all',
    sections: {
      camera:
        'Intimate close-up framed tightly on the face from chin to forehead, with the eyes positioned on the upper-third line. 135mm telephoto compresses features and eliminates any wide-angle distortion. Extremely shallow depth of field — only the eyes and bridge of the nose are critically sharp.',
      subject:
        '{{character}} experiencing a powerful moment of {{emotion}}. The expression is conveyed through the precise interplay of facial action units: the specific crinkle around the eyes, the tension or softness of the jaw, the curve of the lips, the position of the brows. Tears, flushed skin, or other physiological responses add authenticity.',
      environment:
        'Completely abstracted — a single motivated light source creates dramatic chiaroscuro across the face, with the background dissolved into pure shadow or a single tonal wash. The emotional performance exists in isolation, free from any environmental narrative.',
      motion:
        'The expression builds gradually over the duration — starting from neutral and intensifying to the peak emotional beat. Eye moisture gathers, lips tremble, brows shift. The transition is slow enough to read every micro-expression along the journey.',
      style:
        'Award-winning dramatic portrait photography — the kind of image that wins World Press Photo or Taylor Wessing Prize. Raw, honest rendering with no beauty retouching. Single hard light or natural window light creates sculptural shadows that amplify the emotional weight.',
    },
    variables: ['character', 'emotion'],
  },
  {
    id: 'builtin-character-group-scene',
    name: 'Group Scene',
    category: 'character',
    model_family: 'all',
    sections: {
      camera:
        'Medium-wide group shot at eye level capturing {{count}} characters in a naturally staggered arrangement. 35mm lens provides enough width without excessive distortion. Depth of field set to f/5.6 to keep all characters acceptably sharp while softening the background. Camera positioned to create overlapping depth planes.',
      subject:
        '{{characters}} arranged in a dynamic group composition with clear visual hierarchy — the primary character is positioned at the intersection of power lines, others fan out at varying depths. Each character has a distinct pose, expression, and body language that communicates their role and relationship to the group.',
      environment:
        '{{setting}} that provides narrative context for the group gathering. The environment is detailed enough to tell a story but controlled in complexity so it doesn\'t overwhelm the character ensemble. Lighting is motivated by the setting — outdoor natural, interior practical, or dramatic theatrical.',
      motion:
        'Each character exhibits independent micro-movement: one gestures while speaking, another shifts weight, a third turns to look at the speaker. The overlapping rhythms of individual movements create an organic, candid ensemble energy rather than a posed tableau.',
      style:
        'Ensemble drama cinematography with the compositional precision of a Renaissance group portrait. Even but directional lighting ensures every face is readable. Warm, cohesive color palette unifies the group while individual color accents differentiate characters.',
    },
    variables: ['count', 'characters', 'setting'],
  },
];

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export const BUILT_IN_TEMPLATES = [
  ...CINEMATIC_TEMPLATES,
  ...PRODUCT_TEMPLATES,
  ...CHARACTER_TEMPLATES,
];

/**
 * Get built-in templates, optionally filtered by category and/or model family.
 */
export function getBuiltInTemplates({ category, modelFamily } = {}) {
  let templates = BUILT_IN_TEMPLATES;
  if (category) {
    templates = templates.filter((t) => t.category === category);
  }
  if (modelFamily && modelFamily !== 'all') {
    templates = templates.filter(
      (t) => t.model_family === 'all' || t.model_family === modelFamily
    );
  }
  return templates;
}

/**
 * Find a built-in template by ID.
 */
export function getBuiltInTemplate(id) {
  return BUILT_IN_TEMPLATES.find((t) => t.id === id) || null;
}

/**
 * Resolve {{variable}} placeholders in all sections of a template.
 */
export function resolveTemplateVariables(template, variables = {}) {
  const sections = template.sections || {};
  const resolved = {};
  for (const [key, value] of Object.entries(sections)) {
    if (typeof value === 'string') {
      resolved[key] = value.replace(/\{\{(\w+)\}\}/g, (match, varKey) => {
        return variables[varKey] !== undefined ? variables[varKey] : match;
      });
    } else {
      resolved[key] = value;
    }
  }
  return { ...template, sections: resolved };
}
