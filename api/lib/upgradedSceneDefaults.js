/**
 * Upgraded Scene Defaults — reference file for Claude Code.
 * 
 * Apply each entry to the matching framework ID in videoStyleFrameworks.js.
 * Replace the `sceneDefaults` object in each framework.
 */

export const UPGRADED_SCENE_DEFAULTS = {

  personal_journey: {
    lightingDefault: 'single soft key light from camera-left at 45 degrees, 3200K tungsten warmth, subtle fill from a window source camera-right, gentle rim light separating subject from background',
    colorPaletteDefault: 'warm amber and honey tones (#C4956A to #E8C07A), desaturated backgrounds with selective warm highlights on subject, deep brown shadows',
    cameraDefault: 'medium close-up at 50mm f/2.0, shallow depth of field with 2-meter focus distance, subtle handheld drift, eye-level angle',
  },

  origin_story: {
    lightingDefault: 'evolving lighting: early scenes use single bare-bulb overhead 4000K, middle scenes add warm side fill, final scenes use full three-point setup with golden key at 3500K',
    colorPaletteDefault: 'muted desaturated palette (saturation 30-40%) in early scenes shifting to vibrant warm tones (saturation 70-80%) by final scene, consistent blue-gray shadows throughout',
    cameraDefault: 'starts wide at 24mm establishing context, progressively tightens to 85mm intimate portraits, slow dolly-in movement within scenes',
  },

  mini_documentary: {
    lightingDefault: 'dramatic Rembrandt lighting: strong key from 45 degrees camera-left, 4500K daylight balanced, deep shadows on short side of face, narrow strip of fill at 20% key intensity',
    colorPaletteDefault: 'desaturated cool base (saturation 25-35%) with selective warm highlights in teal-orange split toning, deep charcoal shadows (#2B2B2B), accent warmth only on subject',
    cameraDefault: 'slow push-in at 85mm f/1.8, extremely shallow depth of field, tripod-smooth movement, slightly below eye level for authority',
  },

  day_in_the_life: {
    lightingDefault: 'natural available light only: blue pre-dawn 7000K shifting to warm midday 5500K, golden afternoon 3800K, and warm indoor tungsten 2800K evening, no artificial fill',
    colorPaletteDefault: 'authentic ungraded look with slight warmth boost, natural skin tones, green and blue environmental colors, no heavy color grading',
    cameraDefault: 'handheld at 24mm f/2.8 for wide POV, occasional 35mm for medium shots, natural movement and slight rotation, chest-height angle',
  },

  before_after: {
    lightingDefault: 'matched lighting setups: BEFORE uses flat overhead fluorescent at 5000K (unflattering), AFTER uses sculpted three-point with 3500K warm key and beauty fill, same camera position',
    colorPaletteDefault: 'BEFORE: desaturated cool-gray (saturation 20%, cool WB), AFTER: vibrant warm saturated (saturation 80%, warm WB), dramatic contrast between the two states',
    cameraDefault: 'locked tripod at 50mm for matched comparison angles, identical framing in before and after, slow motorized reveal pan for the after',
  },

  explainer_story: {
    lightingDefault: 'bright clean key light from directly above-forward at 5500K daylight, large soft source creating minimal shadows, subtle blue-tinted fill from below for modern tech feel',
    colorPaletteDefault: 'clean modern palette: white and light gray base (#F0F0F0), teal accent (#2EC4B6), warm highlight (#E8B059), high contrast but not harsh',
    cameraDefault: 'medium shot at 35mm f/2.8, smooth motorized zoom transitions between scenes, slightly above eye level for approachable authority',
  },

  emotional_tribute: {
    lightingDefault: 'diffused golden window light at 2800K, heavy atmosphere with visible dust particles, light wrapping softly around subject, deep velvet shadows, no hard edges anywhere',
    colorPaletteDefault: 'warm sepia-shifted palette: skin tones pushed toward peach and rose, backgrounds in deep chocolate and burgundy, golden highlights with slight halation bloom',
    cameraDefault: 'slow dolly at 85mm f/1.4, extremely shallow depth of field creating painterly bokeh, below eye level looking slightly up with reverence',
  },

  top_x_countdown: {
    lightingDefault: 'bold high-contrast lighting: strong directional key at 4500K from 60 degrees, minimal fill, hard shadows creating graphic shapes, color gel accents matching item theme',
    colorPaletteDefault: 'high saturation bold palette: deep navy background (#0A1628), bright accent per item rotating through electric blue (#00B4D8), hot coral (#FF6B6B), vivid lime (#A8E06C), gold (#FFD166)',
    cameraDefault: 'snap zoom at 35mm starting position, quick 2x punch-in for emphasis on each item, dynamic tilted angles, fast reframe between items',
  },

  everything_you_need_to_know: {
    lightingDefault: 'high-key even lighting at 5600K daylight, large overhead softbox feel, minimal shadows for maximum clarity, slight warm edge light for dimension',
    colorPaletteDefault: 'infographic-clean palette: pure white base, dark navy text area (#1B2838), accent colors coded to section type: blue for facts (#4A90D9), green for data (#2ECC71), orange for key stats (#F39C12)',
    cameraDefault: 'tight framing at 50mm for info-dense compositions, clean geometric framing with space for text overlays, quick snap cuts between sections',
  },

  myth_busting: {
    lightingDefault: 'MYTH scenes: harsh red-gelled side light from camera-right, 4000K, uncomfortable shadows. TRUTH scenes: clean bright key from front at 5500K, balanced fill, no harsh shadows',
    colorPaletteDefault: 'binary contrast: MYTH in desaturated reds and grays (#8B0000 tint, saturation 30%), TRUTH in clean whites and confident greens (#00A86B, saturation 70%), sharp visual shift between states',
    cameraDefault: 'MYTH: slightly Dutch angle at 35mm creating unease. TRUTH: level, clean 50mm frame with confident composition. Snap cut between the two states.',
  },

  comparison_versus: {
    lightingDefault: 'split-screen lighting: camera-left lit with cool 6500K blue key, camera-right lit with warm 3500K amber key, creating visual separation between contenders',
    colorPaletteDefault: 'contender-coded colors: Option A in cool blue tones (#1E88E5), Option B in warm amber tones (#FB8C00), neutral gray center divide, verdict in gold (#FFD700)',
    cameraDefault: 'matched 50mm framing for both contenders, identical composition for fair comparison, smooth wipe or split-screen transitions',
  },

  did_you_know: {
    lightingDefault: 'moody theatrical spotlight: single hard source from above at 4000K, pool of light on subject, deep surrounding darkness, slight blue ambient fill in shadows',
    colorPaletteDefault: 'midnight mystery palette: deep navy-black base (#0D1117), warm gold spotlight (#C9A227), subtle purple atmosphere (#2D1B69), each fact getting slightly brighter',
    cameraDefault: 'dramatic push-in from 35mm to 50mm during each fact reveal, centered composition, slight low angle for gravitas',
  },

  challenge_experiment: {
    lightingDefault: 'vlog-authentic: overhead ring light at 5000K for indoor scenes, natural daylight for outdoor, phone-flash fill in low light, progressively better lighting as experiment succeeds',
    colorPaletteDefault: 'authentic slightly warm look: natural skin tones, environment colors ungraded, slight warm push, timestamp overlays in clean white',
    cameraDefault: 'wide-angle 24mm handheld for POV immersion, occasional 35mm for results shots, phone-camera energy, natural shake',
  },

  history_timeline: {
    lightingDefault: 'era-shifting lighting: sepia warm 2800K for historical scenes, neutral 5000K for modern, cool 6500K blue for future, each era has distinct light quality',
    colorPaletteDefault: 'progressive palette: early eras in desaturated sepia and ochre, mid eras in saturated period-appropriate colors, modern eras in clean contemporary tones, future in cool metallic',
    cameraDefault: 'quick cuts at 35mm, each era getting distinct framing style: wide for ancient, medium for modern, tight for future, consistent graphic space for year overlays',
  },

  hot_take: {
    lightingDefault: 'confrontational single key from directly front at 4500K, harsh with minimal diffusion, creating flat but intense illumination, dark void background, slight red edge glow',
    colorPaletteDefault: 'provocative high-contrast: pure black background (#000000), subject in stark white light, red accent (#E53E3E) for emphasis moments, gold (#DAA520) for the alternative',
    cameraDefault: 'tight 85mm close-up for the take, face filling most of frame, subtle slow zoom-in during argument, pull-out to 50mm for the alternative reveal',
  },

  how_it_works: {
    lightingDefault: 'educational clarity: bright even 5500K key with large diffusion, soft fill at 50% to eliminate confusing shadows, slight blue backlight for depth and modern feel',
    colorPaletteDefault: 'clean diagram-friendly palette: light gray base (#F5F5F5), primary blue (#3B82F6) for key concepts, secondary teal (#14B8A6) for mechanisms, warm orange (#F59E0B) for highlights',
    cameraDefault: 'medium at 40mm for clear subject framing, smooth zoom for emphasis, clean composition with space for conceptual overlays, eye-level for approachability',
  },

  // ── NICHE-SPECIFIC ─────────────────────────────────────────────────

  horror_campfire: {
    lightingDefault: 'single warm point source from below-center (campfire simulation) at 2200K, flickering intensity, deep black shadows above eye line, no fill light, occasional cold blue moonlight rim from behind',
    colorPaletteDefault: 'campfire horror: warm orange on underlit face (#CC6600), pitch black above and behind (#000000), sickly green in peripheral shadows (#1A3A1A), no clean whites anywhere',
    cameraDefault: 'slow creep at 65mm, shallow focus with 1.5m distance, below eye level looking up into shadows, subtle handheld tremor increasing with tension',
  },

  horror_creepy_countdown: {
    lightingDefault: 'deteriorating lighting per entry: first entry has partial room lighting at 4000K, each subsequent entry loses a light source, final entry is near-darkness with single phone-screen glow',
    colorPaletteDefault: 'progressive decay: first entry in desaturated natural (#808080 base), each entry shifting cooler and greener, final entry in sickly fluorescent green (#39FF14) on black',
    cameraDefault: 'tightening frame per entry: starts at 35mm full scene, each entry 10mm tighter, final entry at extreme 135mm close-up with almost no context',
  },

  horror_urban_legend: {
    lightingDefault: 'fog-diffused moonlight at 7000K blue-white from above, heavy atmospheric haze reducing contrast, occasional orange sodium-vapor streetlight intrusion, no direct illumination on subject',
    colorPaletteDefault: 'nocturnal desaturated: cold blue-gray base (#2C3E50), yellow-orange streetlight pools (#B8860B), dark forest greens in periphery (#1A2F1A), skin tones pushed cold',
    cameraDefault: 'slow atmospheric 35mm, medium depth of field keeping foreground and background slightly threatening, low angle through fog, tracking movement',
  },

  crime_case_file: {
    lightingDefault: 'noir interrogation: single hard overhead at 4500K creating sharp nose and brow shadows, thin strip of warm light from a desk lamp, blue-tinted cold fill from a window suggesting late night',
    colorPaletteDefault: 'noir investigative: deep blacks (#0A0A0A), amber desk lamp pools (#B8860B), cold blue-steel highlights (#4A6FA5), paper-white for documents, minimal color saturation overall',
    cameraDefault: 'classic noir 50mm, medium shots with strong diagonal compositions, dutch angle for tension moments, close-ups on evidence at 85mm macro',
  },

  crime_evidence_trail: {
    lightingDefault: 'forensic clinical: overhead fluorescent at 5500K for evidence scenes, warm 3000K desk lamp for detective scenes, blue-UV light accent for forensic detail, harsh and revealing',
    colorPaletteDefault: 'clinical evidence palette: sterile white base (#FFFFFF), forensic blue (#1E3A5F), evidence red tags (#C0392B), detective warm brown (#795548), cold steel gray (#78909C)',
    cameraDefault: 'extreme macro at 100mm for evidence detail, pull to 50mm medium for context, flat clinical angles for documentation, slightly dutch for detective POV',
  },

  crime_cold_case: {
    lightingDefault: 'aged fluorescent: flickering 4000K overhead in basement archive, warm 2800K reading lamp on old files, dust visible in light beams, cold blue from a small basement window',
    colorPaletteDefault: 'yellowed archive: paper-aged yellow (#F5E6C8), filing-cabinet green (#6B8E6B), faded photograph sepia (#D2B48C), modern forensic blue when new evidence appears (#2196F3)',
    cameraDefault: 'slow macro at 85mm across aged documents, pull to 35mm wide for empty archive rooms, time-lapse feel, dust-mote depth of field',
  },

  science_discovery: {
    lightingDefault: 'lab environment: overhead fluorescent at 5500K for wide shots, dramatic single spot on discovery object at 4000K warm, blue LED accent from equipment screens, slight lens flare on breakthrough moment',
    colorPaletteDefault: 'discovery lab: clinical white and steel (#E0E0E0), equipment blue (#1565C0), breakthrough gold (#FFB300), microscope green (#4CAF50), data-screen cyan (#00BCD4)',
    cameraDefault: 'wide 24mm for lab establishing, tight 100mm macro for discovery detail, smooth motorized push-in for eureka moment, slight low angle for scientific authority',
  },

  science_nature_secrets: {
    lightingDefault: 'nature documentary: golden hour at 3500K for terrestrial, underwater blue-green at 6000K for ocean, bioluminescent accent glow for deep sea, high-contrast sunbeam shafts through canopy',
    colorPaletteDefault: 'vivid natural: rainforest emerald (#006400), ocean sapphire (#000080), coral reef spectrum (#FF6347 to #00CED1), volcanic amber (#FF4500), arctic white-blue (#B0E0E6)',
    cameraDefault: 'telephoto 200mm for wildlife, macro 100mm for small creatures, sweeping 16mm wide for landscapes, slow-motion suggest framing',
  },

  science_thought_experiment: {
    lightingDefault: 'abstract conceptual: floating point sources of varying 4000-6000K, impossible lighting angles that shift with the thought experiment, clean but surreal',
    colorPaletteDefault: 'cerebral abstract: deep space void (#0A0A1A), quantum probability purple (#6A0DAD), thought-beam white (#FFFFFF), parallel-universe gold (#FFD700), impossibility red (#FF1744)',
    cameraDefault: 'impossible camera: starts at normal 50mm, gradually shifts to surreal wide 14mm as concepts get wilder, impossible angles that match the thought experiment',
  },

  ai_tech_demo: {
    lightingDefault: 'modern tech: cool blue backlight at 6500K from monitors, warm face fill at 4000K from screen glow, clean overhead at 5000K, slight lens flare from UI elements',
    colorPaletteDefault: 'tech UI palette: dark interface (#1A1A2E), neon accent blue (#00D4FF), success green (#00E676), data purple (#7C4DFF), warm skin tones preserved',
    cameraDefault: 'screen-capture framing at 35mm showing both UI and reaction, tight 85mm for result close-ups, smooth transition zooms',
  },

  ai_breaking_news: {
    lightingDefault: 'news broadcast: flat front key at 5500K with soft fill, red accent glow for breaking urgency, clean even illumination, slight practical light from screen reflections',
    colorPaletteDefault: 'breaking news: deep red banner (#CC0000), clean white text area (#FFFFFF), dark authoritative blue (#0D47A1), urgent orange accent (#FF6D00)',
    cameraDefault: 'tight 50mm anchor framing with lower-third space, quick snap cuts, slight push-in for emphasis, clean broadcast composition',
  },

  ai_tool_review: {
    lightingDefault: 'clean product review: bright overhead at 5500K, product key light from 45 degrees at 4500K warm, subtle gradient background lit from below, rim light separating from background',
    colorPaletteDefault: 'review clean: dark gradient background (#1A1A2E to #2D2D44), product highlight white, pros green (#4CAF50), cons red (#F44336), rating gold (#FFC107)',
    cameraDefault: 'product showcase at 50mm, close-up feature shots at 85mm, comparison split-frames, clean rating overlay composition',
  },

  finance_blueprint: {
    lightingDefault: 'professional authority: warm key at 4000K from camera-left, clean fill at 60% from right, subtle backlight, desk lamp practical suggesting late-night strategy work',
    colorPaletteDefault: 'wealth professional: deep navy (#0D1B2A), trust gold (#C49B3C), growth green (#1B5E20), clean white for data (#FAFAFA), warm wood brown for authority (#5D4037)',
    cameraDefault: 'medium-close at 65mm for mentor authority, pull to 35mm for step overviews, smooth tracked dolly for progression, slightly below eye-level',
  },

  finance_market_pulse: {
    lightingDefault: 'trading floor: multiple cool screens casting 6500K blue-white, warm 3000K practical desk lamps, green and red ticker accent light, fast-moving shadows from scrolling data',
    colorPaletteDefault: 'financial terminal: black terminal (#0A0A0A), gain green (#00C853), loss red (#FF1744), data blue (#2196F3), alert amber (#FFAB00)',
    cameraDefault: 'tight data-focused at 50mm, quick snap to 85mm for key numbers, terminal screen fill, overlay-friendly composition',
  },

  finance_money_mistakes: {
    lightingDefault: 'cautionary: harsh overhead at 5000K for mistake scenes (unflattering), warm corrective 3500K side light for fix scenes, red warning glow accent on mistakes',
    colorPaletteDefault: 'warning-to-solution: mistake red (#B71C1C), warning amber (#FF8F00), fix green (#2E7D32), clean white for clarity, dark worry gray (#424242)',
    cameraDefault: 'slightly dutch angle 35mm for mistakes creating unease, level clean 50mm for fixes, graphic-overlay composition',
  },

  motivation_rise_grind: {
    lightingDefault: 'pre-dawn to triumph: starts in cold blue darkness at 7000K, single streetlamp amber 2200K, sunrise golden at 3200K breaking through, full triumphant warm daylight at 4500K by end',
    colorPaletteDefault: 'darkness-to-glory: cold blue-black start (#0D1B2A), streetlamp amber (#B8860B), sunrise gold (#FFB300), triumph warm white-gold (#FFF3E0)',
    cameraDefault: 'starts wide 24mm showing isolation, tightens through scenes to 50mm intimate effort, 85mm close-up on face at breakthrough, tracks running movement',
  },

  motivation_mindset_shift: {
    lightingDefault: 'perceptual shift: old mindset in flat even 5500K (boring, institutional), moment of clarity gets single dramatic shaft of warm 3200K light, new mindset in rich dimensional three-point at 4000K',
    colorPaletteDefault: 'gray-to-gold: old mindset in desaturated gray (#9E9E9E), clarity moment in breakthrough gold (#FFD54F), new mindset in rich warm balanced tones, progressive saturation increase',
    cameraDefault: 'old mindset: static locked 50mm. Clarity: subtle rack focus shift. New mindset: fluid 35mm with gentle movement.',
  },

  motivation_life_lesson: {
    lightingDefault: 'intimate confession: single warm candle-quality source at 2200K, extremely soft, deep intimate shadows, slight moisture/sheen on skin from warm close source, no hard edges',
    colorPaletteDefault: 'deep intimate: candlelight amber (#D4A574), deep burgundy shadows (#3E0E0E), warm skin glow, chocolate brown midtones (#3E2723), slight golden highlight',
    cameraDefault: 'intimate 85mm f/1.4 portrait, extremely shallow focus, subject fills 60% of frame, eye-level direct address, imperceptible slow push-in',
  },

  dating_love_story: {
    lightingDefault: 'romantic: soft diffused window light at 3200K with warm golden quality, bokeh string lights in background, gentle rim light on hair, soft and flattering',
    colorPaletteDefault: 'romantic warm: rose gold (#E8B4B8), warm peach skin tones, soft amber highlights (#FFDAB9), deep romantic burgundy (#722F37), bokeh warm gold',
    cameraDefault: 'intimate 85mm f/1.4 portrait, extreme shallow depth of field, eye-level tender angle, gentle handheld sway suggesting closeness',
  },

  dating_red_flags: {
    lightingDefault: 'warning: red accent glow increasing per flag, base lighting cool 5500K and clinical, harsh direct front light for uncomfortable truth, shifting to warm empowering gold for advice',
    colorPaletteDefault: 'red flag: warning red (#D32F2F) deepening per entry, clinical white for clarity, empowerment gold (#FFB300) for the solution, dark serious (#1A1A1A) base',
    cameraDefault: 'tight confrontational 85mm for flags, pulling to 50mm for advice, graphic space for flag number overlays, intense direct framing',
  },

  dating_attachment: {
    lightingDefault: 'therapeutic: soft warm 3500K with large diffusion panel, gentle even fill suggesting safety, slight warm edge light, comfortable and non-threatening',
    colorPaletteDefault: 'therapeutic calm: warm neutral base (#FFF8E1), soothing sage green (#A5D6A7), understanding blue (#90CAF9), gentle lavender (#CE93D8), warm wood tones (#8D6E63)',
    cameraDefault: 'comfortable medium 50mm at eye level, suggesting a conversation between equals, soft focus background, steady and still creating safety',
  },

  fitness_transformation: {
    lightingDefault: 'BEFORE: flat overhead gym fluorescent 4500K unflattering. AFTER: sculpted side key at 4000K showing definition, warm 3200K fill, rim light on muscles. Same position, different quality.',
    colorPaletteDefault: 'transformation: before muted gray-green (#78909C), after warm healthy tones with slight tan warmth, gym equipment dark (#424242), progress green (#4CAF50)',
    cameraDefault: 'matched mirror angle 50mm for comparison, consistent framing before/after, action 35mm handheld for training montage, hero 85mm for result detail',
  },

  fitness_health_hack: {
    lightingDefault: 'clean wellness: bright 5500K with warm 4000K fill, fresh and energetic, slight green-tinted accent for health',
    colorPaletteDefault: 'health fresh: clean white (#FFFFFF), wellness green (#4CAF50), energy orange (#FF9800), fresh blue (#03A9F4), natural wood warm (#8D6E63)',
    cameraDefault: 'product/food close-up 85mm for hack detail, medium 50mm for demonstration, infographic space for science overlay, bright clean composition',
  },

  fitness_myth_buster: {
    lightingDefault: 'gym truth: MYTH in harsh overhead 5000K creating unflattering shadows (bad form). TRUTH in properly lit 4500K with fill (correct form).',
    colorPaletteDefault: 'myth/truth: myth red tint (#C62828), truth green tint (#2E7D32), gym equipment neutral (#757575), body-positive warm for correct form',
    cameraDefault: 'exercise demonstration 35mm showing full form, split-screen 50mm for myth vs truth comparison, graphic overlay space for myth/truth labels',
  },

  gaming_lore: {
    lightingDefault: 'fantasy cinematic: rich atmospheric sources — firelight 2200K, magical glow in supernatural colors, volumetric god-rays through ancient windows, torch-lit dungeon ambiance',
    colorPaletteDefault: 'fantasy lore: ancient gold (#B8860B), magical purple (#7B1FA2), forest dark green (#1B5E20), stone gray (#616161), fire orange (#E65100), enchantment blue (#1565C0)',
    cameraDefault: 'cinematic game-capture 35mm for world establishing, 85mm for character portraits, dramatic low angles for epic reveals, slow pan across lore-rich environments',
  },

  gaming_easter_eggs: {
    lightingDefault: 'game-screen glow: UI-colored light sources in neon spectrum, dark room with screen as primary illumination, discovery spotlight effect on hidden details',
    colorPaletteDefault: 'game UI neon: screen dark (#0A0A1A), discovery highlight (#00E5FF), easter-egg gold (#FFD700), UI accent green (#76FF03), pixel art palette for retro eggs',
    cameraDefault: 'screen-capture framing, zoom-enhance on hidden details, before/after reveal compositions, numbered overlay space',
  },

  gaming_pop_breakdown: {
    lightingDefault: 'media commentary: ring light 5000K direct front for commentary feel, colored accent matching the topic franchise, screen-glow blue from reference materials',
    colorPaletteDefault: 'pop culture bold: trending gradient (topic-specific), commentary white, hot-take red (#FF1744), background dark (#1A1A2E), franchise accent colors',
    cameraDefault: 'tight commentary 50mm for takes, cut-away composition for reference, split-frame for comparison, trending-content energy framing',
  },

  conspiracy_rabbit_hole: {
    lightingDefault: 'descending: surface level in clean 5500K daylight, each level darker — level 2 in amber desk lamp 3000K, level 3 in green monitor glow 6500K, bottom in single red LED',
    colorPaletteDefault: 'depth-coded: surface neutral (#9E9E9E), level 1 amber (#FFB300), level 2 suspicious green (#388E3C), level 3 paranoid purple (#6A1B9A), bottom conspiracy red (#B71C1C)',
    cameraDefault: 'progressively tighter: surface at wide 24mm, each level 15mm tighter, bottom at claustrophobic 100mm close-up, corkboard and red-string framing',
  },

  conspiracy_cover_up: {
    lightingDefault: 'investigative: stark fluorescent 5500K for government/official scenes, warm desk lamp 3000K for journalist work, harsh interrogation single-source for truth scenes',
    colorPaletteDefault: 'classification: government gray (#78909C), classified red (#C62828), redacted black (#000000), truth white (#FFFFFF), journalist warm amber (#FFB74D)',
    cameraDefault: 'document-focused 50mm macro, wide 24mm for institutional establishing, tight 85mm for whistleblower',
  },

  conspiracy_unsolved: {
    lightingDefault: 'ethereal unresolved: diffused soft 4500K with no clear source direction, fog-like atmosphere, slight cool shift suggesting incompleteness, never fully lit, never fully dark',
    colorPaletteDefault: 'unresolved liminal: fog gray (#B0BEC5), mystery deep blue (#1A237E), theory purple (#4A148C), question-mark gold (#FFD54F), void black (#0A0A0A)',
    cameraDefault: 'contemplative slow 50mm, lots of negative space suggesting the unknown, soft focus background, gentle drift, never arriving at a clear composition',
  },

  space_cosmic_journey: {
    lightingDefault: 'cosmic: Earth scenes lit by warm sun at 5500K, deep space scenes lit by distant starlight and nebula glow, no atmosphere scattering, harsh light/shadow boundaries in vacuum',
    colorPaletteDefault: 'cosmic spectrum: Earth blue-white (#87CEEB), solar gold (#FFD700), nebula magenta-purple (#8B008B to #4B0082), void absolute black (#000000), star white point (#FFFFFF)',
    cameraDefault: 'sweeping ultra-wide for cosmic scale, slow zoom for distance, macro for planet surface detail, tracking fly-through for nebula',
  },

  space_mystery: {
    lightingDefault: 'anomalous: standard space lighting disrupted by unexplained glow source at unusual color temperature (shifting 2000-8000K), pulsing intensity, casting shadows in impossible directions',
    colorPaletteDefault: 'anomaly palette: normal space blue-black (#0A0A2A), anomaly emission color cycling through unnatural hues (#FF1744, #00E5FF, #76FF03), data-screen amber (#FFB74D)',
    cameraDefault: 'telescope viewport framing, data-overlay compositions, zoom-enhance on anomaly, wide establishing then tight analysis',
  },

  space_cosmic_scale: {
    lightingDefault: 'scale-relative: Earth scenes in familiar daylight 5500K, each scale-up reduces relative light intensity, final cosmic scales lit by diffuse background radiation at cold blue-shift',
    colorPaletteDefault: 'human-to-cosmic gradient: familiar warm Earth tones at start, cooling and desaturating with each scale, final frames in deep cosmic blue-violet with white star points only',
    cameraDefault: 'matched zoom-out progression: starts at human-scale 50mm, each comparison wider (35mm, 24mm, 16mm, 14mm), final cosmic at virtual 6mm ultra-wide',
  },

  animals_creature_feature: {
    lightingDefault: 'BBC documentary: golden savanna at 3500K for terrestrial, underwater caustic dapple at 5500K for marine, pre-dawn blue at 7000K for nocturnal, natural source only',
    colorPaletteDefault: 'habitat-authentic: savanna gold and ochre (#DAA520, #CC8400), ocean blue-green (#006064), rainforest emerald (#1B5E20), arctic silver-blue (#B0BEC5), natural fur/scale colors',
    cameraDefault: 'telephoto 300mm for wildlife at distance, 100mm macro for detail (eyes, scales, feathers), 16mm wide for habitat establishing, slow patient tracking',
  },

  animals_superpowers: {
    lightingDefault: 'dramatic hero-shot: strong theatrical key at 4500K from low-front, rim light outlining the animal form, colored accent matching the superpower theme, epic scale lighting',
    colorPaletteDefault: 'superhero nature: bold saturated (70-90%), power-specific accent per animal (electric blue for speed, fire orange for strength, deep purple for stealth), dark dramatic backgrounds',
    cameraDefault: 'hero-angle low 35mm looking up at the animal, dynamic action-ready framing, tight 85mm for ability detail, dramatic reveal compositions',
  },

  animals_nature_hunt: {
    lightingDefault: 'wildlife hunt: harsh midday 5500K overhead (predator visible), golden grass-filtered light at 3800K (prey hiding), dust-filled shafts of light during chase, natural raw intensity',
    colorPaletteDefault: 'savanna hunt: dry grass gold (#C4A35A), predator earth tones, prey camouflage greens and browns, dust-cloud khaki, tension-red for the strike moment',
    cameraDefault: 'telephoto 400mm for stalking distance, quick pan-following at 200mm for chase, macro 100mm for predator eyes, wide 16mm for aftermath landscape',
  },

  sports_athlete_rise: {
    lightingDefault: 'progression: harsh gym fluorescent 4500K for training, stadium sodium-vapor 2700K amber for competition, champion spotlight pure white 5500K for victory',
    colorPaletteDefault: 'grit-to-glory: muted gym grays and concrete (#757575), team colors emerging mid-story, final scenes in saturated victory gold (#FFD700) and champion white',
    cameraDefault: 'wide 24mm for training establishing, 85mm tight for grit detail, slow-motion 50mm for the victory moment, crowd-wide 16mm for celebration',
  },

  sports_game_changer: {
    lightingDefault: 'stadium dramatic: overhead sodium-vapor at 2700K mixed with LED at 5500K, camera-flash strobe simulation, dramatic single spotlight for the key moment, crowd lit by phone screens',
    colorPaletteDefault: 'stadium night: dark field (#1A1A1A), bright grass green (#2E7D32), team jersey colors saturated, scoreboard amber (#FFB300), flash-white for the moment (#FFFFFF)',
    cameraDefault: 'wide 16mm for stakes establishing, progressive tight 50mm to 85mm to 135mm building to the moment, extreme slow-motion framing for the play',
  },

  sports_stats_showdown: {
    lightingDefault: 'sports broadcast studio: clean even 5500K with slight warm key, team-colored gel accents, scoreboard backlight glow, professional broadcast polish',
    colorPaletteDefault: 'data-sport: dark broadcast blue (#0D1B2A), stat white (#FFFFFF), team color A vs B, gold for winner (#FFD700), green for positive (#4CAF50), red for negative (#F44336)',
    cameraDefault: 'data-overlay 50mm with generous graphic space, split-frame comparison, scoreboard composition, clean stat-card framing',
  },

  travel_hidden_gem: {
    lightingDefault: 'discovery golden hour: warm 3200K side light creating long shadows and texture on landscape, slight atmospheric haze catching light beams, magic hour quality throughout',
    colorPaletteDefault: 'wanderlust: travel blue sky (#87CEEB), golden hour amber (#FF8F00), lush destination green (#388E3C), water turquoise (#00897B), warm stone (#A1887F)',
    cameraDefault: 'epic wide 16mm for landscape reveals, 35mm for intimate discovery moments, drone-suggest aerial framing, slow cinematic pan',
  },

  travel_hacks: {
    lightingDefault: 'airport-to-destination mix: bright 5500K travel lighting, warm departure lounge amber, cool airplane blue, destination-specific natural light',
    colorPaletteDefault: 'travel practical: passport blue (#1A237E), boarding-pass white, destination warm tones, money-saving green (#00C853), tip gold (#FFB300)',
    cameraDefault: 'tight 50mm for hack detail, phone-style 28mm for travel context, graphic overlay composition, quick snap cuts',
  },

  travel_adventure_log: {
    lightingDefault: 'raw adventure: uncontrolled natural light shifting with location, harsh midday to soft twilight, campfire 2200K, headlamp beam in darkness, authentically imperfect',
    colorPaletteDefault: 'adventure raw: mountain blue (#1565C0), jungle green (#2E7D32), desert gold (#FF8F00), ocean teal (#00838F), fire orange (#FF5722), dirt brown (#5D4037)',
    cameraDefault: 'GoPro-wide 16mm for action POV, 35mm handheld for campsite intimacy, telephoto 200mm for landscape detail, natural movement',
  },

  psych_mind_trick: {
    lightingDefault: 'optical illusion: clean 5500K front light that shifts mid-scene, impossible double shadows, slight color temperature split between left and right halves of frame',
    colorPaletteDefault: 'high-contrast perceptual: stark black and white base, single accent color per scene (electric blue #00B0FF for attention, red #FF1744 for misdirection)',
    cameraDefault: 'precise geometric 50mm compositions designed for perceptual tricks, locked tripod, clean mathematical framing, strategic negative space',
  },

  psych_social_experiment: {
    lightingDefault: 'clinical observation: overhead institutional fluorescent at 5500K creating flat even illumination, CCTV-quality feel, no dramatic shadows, slightly green-shifted',
    colorPaletteDefault: 'institutional: sterile off-white walls (#F0EDE8), institutional green undertone (#3E4A3E), subject in muted clothing, no bright colors, growing unease through slight color shift',
    cameraDefault: 'surveillance 24mm wide showing full room, security camera high angle, clinical observation framing, medium 50mm for subject close-ups',
  },

  psych_facts: {
    lightingDefault: 'cerebral glow: dark base with single spot at 4500K on subject/concept, neural-network blue accent lights (#1E88E5), synaptic pulse highlights, clean modern feel',
    colorPaletteDefault: 'neural: deep brain-gray (#1A1A2E), synapse blue (#42A5F5), neural gold (#FFB300), thought-pulse white (#FFFFFF), mind-dark purple (#311B92)',
    cameraDefault: 'centered 50mm with clean graphic composition, smooth snap-zoom for each fact, space for numbered overlays, punchy framing',
  },

  food_recipe_reveal: {
    lightingDefault: 'food photography: warm key at 3500K from 10 o\'clock position creating appetizing shadows, large fill card from right, backlight at 4000K creating steam glow and rim on dishes',
    colorPaletteDefault: 'appetizing: warm wood surface (#5D4037), ingredient-specific vibrant colors, golden cook crust (#DAA520), steam white, plate white (#FAFAFA), herb green (#2E7D32)',
    cameraDefault: 'overhead 35mm for prep layout, 45-degree 50mm for cooking action, macro 100mm for texture detail, hero 85mm for final plate',
  },

  food_science: {
    lightingDefault: 'kitchen-lab hybrid: clinical 5500K overhead for science, warm 3500K side for food beauty, macro ring light for molecular detail, slight blue backlight for tech',
    colorPaletteDefault: 'food-science: clean white base, food colors natural and vibrant, Maillard reaction brown-gold (#8B6914), caramelization amber (#FF8F00), chemical diagram blue (#2196F3)',
    cameraDefault: 'macro 100mm for molecular/chemical detail, medium 50mm for process, extreme close-up for reaction moments, diagram-friendly composition',
  },

  food_street_tour: {
    lightingDefault: 'street market: mixed practical lighting — neon signs at various colors, food stall warm tungsten 2500K, wok flame orange glow, steam backlit by streetlights, chaotic authentic',
    colorPaletteDefault: 'street market vibrant: neon pink (#FF1493), food-stall amber (#FF8F00), night market blue (#1E3A5F), wok-fire orange (#FF5722), cultural accents from locale',
    cameraDefault: 'handheld 24mm walking through market, tight 50mm on food close-ups, POV bite shots, vendor action 35mm, authentic movement',
  },

  edu_quick_lesson: {
    lightingDefault: 'whiteboard clean: bright even 5500K overhead, slight warm fill at 4500K for friendliness, no dramatic shadows, pure clarity, slight backlight for dimension',
    colorPaletteDefault: 'educational clean: white base (#FFFFFF), explanation blue (#1976D2), highlight yellow (#FFC107), success green (#4CAF50), key-point red (#E53935), friendly warm neutral (#FFF8E1)',
    cameraDefault: 'clean centered 40mm for teaching framing, zoom-in for concept emphasis, graphic-friendly composition with overlay space, eye-level for approachability',
  },

  edu_fact_blast: {
    lightingDefault: 'punchy bright: high-key 5500K even lighting, slight colored gel accent matching fact theme, clean modern studio feel, energetic brightness',
    colorPaletteDefault: 'fact-coded: each fact gets a signature color from a bold palette (blue, coral, gold, emerald, purple), dark base (#1A1A2E), fact-number white',
    cameraDefault: 'centered 50mm with numbered graphic space, snap-zoom for emphasis, clean composition rotating through fact-specific framing',
  },

  edu_discovery: {
    lightingDefault: 'historical-to-modern: early scenes in warm 2800K candlelight/gaslight, discovery in dramatic 4000K shaft of light, modern implications in clean 5500K daylight',
    colorPaletteDefault: 'discovery arc: historical sepia and parchment (#D2B48C), eureka gold (#FFD700), modern clean white and blue, warm wood and brass tones for period',
    cameraDefault: 'period-appropriate 50mm for historical, dramatic push-in 35mm to 50mm for eureka, clean modern 35mm for implications',
  },

  paranormal_encounter: {
    lightingDefault: 'found-footage: single flashlight beam at 5500K cutting through darkness, phone screen glow at 6500K blue-white on face, anomalous light source at impossible color temperature',
    colorPaletteDefault: 'encounter fear: absolute black void (#000000), flashlight white cone, phone-screen cold blue on face, anomaly color cycling through unnatural hues, night-vision green (#39FF14)',
    cameraDefault: 'found-footage 24mm handheld with deliberate shake increasing with fear, phone-camera perspective, POV framing, night-vision quality degradation',
  },

  paranormal_evidence: {
    lightingDefault: 'classified analysis: desk lamp at 3000K on documents, monitor glow at 6500K, harsh overhead fluorescent at 5000K for evidence examination',
    colorPaletteDefault: 'evidence file: manila folder tan (#D2B48C), classified red stamp (#C62828), redaction black (#000000), analysis blue (#1565C0), evidence spotlight white',
    cameraDefault: 'macro 100mm for document detail, 50mm for evidence board wide, extreme tight on photos, investigative pan across materials',
  },

  paranormal_investigation: {
    lightingDefault: 'investigation kit: EMF detector green glow, infrared camera red spots, flashlight at 5500K, spirit box blue LED, each tool casting its own distinct light, darkness dominant',
    colorPaletteDefault: 'night investigation: pitch black base (#000000), flashlight white, equipment green (#76FF03), infrared red (#FF1744), thermal imaging purple-orange spectrum',
    cameraDefault: 'night-vision 24mm wide for location, handheld investigation movement, equipment close-up at 50mm, long static shots of empty spaces',
  },

  business_startup_story: {
    lightingDefault: 'garage-to-boardroom: single bare bulb 3500K for garage, co-working harsh mixed 4500K for scrappy phase, professional three-point 5000K for scale-up',
    colorPaletteDefault: 'scrappy-to-polished: bare concrete gray (#9E9E9E), sticky-note yellow (#FFF176), whiteboard blue (#42A5F5), success green (#00C853), corporate navy (#0D47A1)',
    cameraDefault: 'shaky 24mm handheld for garage energy, stabilizing through scenes, locked 50mm professional for boardroom, visual polish matching company growth',
  },

  business_breakdown: {
    lightingDefault: 'professional analytical: clean 5500K with warm accent, corporate office quality, data-screen glow accents, slight blue backlight for modern tech feel',
    colorPaletteDefault: 'corporate analysis: navy authority (#0D47A1), revenue green (#00C853), cost red (#E53935), data blue (#2196F3), clean white for charts (#FAFAFA)',
    cameraDefault: 'infographic-friendly 50mm with generous overlay space, split-frame for comparison, data-dashboard framing, clean corporate composition',
  },

  business_revenue_playbook: {
    lightingDefault: 'hustle workspace: bright 5500K overhead, laptop screen glow, warm coffee-shop amber 3000K undertone, energetic and productive, multiple practical sources',
    colorPaletteDefault: 'money-making: wealth green (#00C853), hustle black (#1A1A1A), step gold (#FFB300), revenue metric white, action red for urgency (#FF1744)',
    cameraDefault: 'laptop-workspace 35mm for context, tight 50mm for step detail, graphic-overlay composition for revenue numbers, hustle-energy framing',
  },

  // ── REMAINING UNIVERSAL FRAMEWORKS ─────────────────────────────────

  history_lost_civilization: {
    lightingDefault: 'golden ancient light: warm 3200K sunlight filtering through ruins, dramatic desert light at 4000K with deep shadows, archaeological dig site with mixed practical and sun sources',
    colorPaletteDefault: 'ancient palette: sandstone gold (#DAA520), aged stone gray (#808080), desert ochre (#CC8400), sky blue (#87CEEB), faded mural colors, patina green (#2E8B57)',
    cameraDefault: 'sweeping wide 16mm for ruins establishing, 50mm for architectural detail, 85mm for artifact close-ups, slow reverent pans',
  },

  history_what_if: {
    lightingDefault: 'split reality: historical scenes in warm 3200K period lighting, alternate timeline in cool 6500K blue-shifted surreal light, transition moment in dramatic amber',
    colorPaletteDefault: 'dual timeline: historical muted sepia (#D2B48C), alternate vivid surreal tones (shifted hues), divergence point in stark gold (#FFD700) and white',
    cameraDefault: 'documentary 50mm for historical grounding, dreamlike wide 24mm for alternate paths, split-screen compositions at divergence points',
  },

  history_forgotten_heroes: {
    lightingDefault: 'portrait dignity: warm 3500K key light creating Rembrandt triangle, soft fill preserving shadow detail, slight golden rim suggesting heroic quality, aged photograph quality for historical scenes',
    colorPaletteDefault: 'dignified historical: warm sepia base (#D2B48C), portrait gold (#C49B3C), achievement white (#FAFAFA), injustice cold gray (#607D8B), legacy warm amber (#FF8F00)',
    cameraDefault: 'portrait 85mm for subject dignity, 35mm for historical context establishing, documentary pans across achievements, reverent framing',
  },
};
