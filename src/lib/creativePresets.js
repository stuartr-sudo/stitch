/**
 * Shared presets for props, negative prompts, and other creative options
 * used across Imagineer, Edit, Turnaround, and Storyboard tools.
 */

export const PROP_CATEGORIES = [
  { label: 'Vehicles & Transport', props: [
    { value: 'bicycle', label: 'Bicycle' },
    { value: 'skateboard', label: 'Skateboard' },
    { value: 'scooter', label: 'Scooter' },
    { value: 'surfboard', label: 'Surfboard' },
    { value: 'horse', label: 'Horse' },
    { value: 'motorcycle', label: 'Motorcycle' },
  ]},
  { label: 'Weapons & Combat', props: [
    { value: 'sword', label: 'Sword' },
    { value: 'shield', label: 'Shield' },
    { value: 'bow', label: 'Bow & Arrow' },
    { value: 'staff', label: 'Staff' },
    { value: 'axe', label: 'Axe' },
    { value: 'spear', label: 'Spear' },
    { value: 'dagger', label: 'Dagger' },
    { value: 'hammer', label: 'War Hammer' },
  ]},
  { label: 'Musical Instruments', props: [
    { value: 'guitar', label: 'Guitar' },
    { value: 'violin', label: 'Violin' },
    { value: 'drums', label: 'Drums' },
    { value: 'trumpet', label: 'Trumpet' },
    { value: 'piano-keyboard', label: 'Keyboard' },
    { value: 'microphone', label: 'Microphone' },
  ]},
  { label: 'Sports & Outdoor', props: [
    { value: 'basketball', label: 'Basketball' },
    { value: 'soccer-ball', label: 'Soccer Ball' },
    { value: 'tennis-racket', label: 'Tennis Racket' },
    { value: 'baseball-bat', label: 'Baseball Bat' },
    { value: 'fishing-rod', label: 'Fishing Rod' },
    { value: 'climbing-gear', label: 'Climbing Gear' },
    { value: 'ski-poles', label: 'Ski Poles' },
  ]},
  { label: 'Tools & Equipment', props: [
    { value: 'camera', label: 'Camera' },
    { value: 'laptop', label: 'Laptop' },
    { value: 'toolbox', label: 'Toolbox' },
    { value: 'paintbrush', label: 'Paintbrush & Palette' },
    { value: 'magnifying-glass', label: 'Magnifying Glass' },
    { value: 'telescope', label: 'Telescope' },
    { value: 'binoculars', label: 'Binoculars' },
  ]},
  { label: 'Fantasy & Magic', props: [
    { value: 'wand', label: 'Magic Wand' },
    { value: 'spell-book', label: 'Spell Book' },
    { value: 'crystal-ball', label: 'Crystal Ball' },
    { value: 'potion', label: 'Potion Bottle' },
    { value: 'magic-orb', label: 'Magic Orb' },
    { value: 'fairy-wings', label: 'Fairy Wings' },
    { value: 'lantern', label: 'Lantern' },
  ]},
  { label: 'Everyday Items', props: [
    { value: 'backpack', label: 'Backpack' },
    { value: 'umbrella', label: 'Umbrella' },
    { value: 'book', label: 'Book' },
    { value: 'phone', label: 'Phone' },
    { value: 'coffee-cup', label: 'Coffee Cup' },
    { value: 'bag', label: 'Shopping Bag' },
    { value: 'suitcase', label: 'Suitcase' },
    { value: 'newspaper', label: 'Newspaper' },
  ]},
  { label: 'Accessories & Wearable', props: [
    { value: 'helmet', label: 'Helmet' },
    { value: 'cape', label: 'Cape' },
    { value: 'crown', label: 'Crown' },
    { value: 'mask', label: 'Mask' },
    { value: 'goggles', label: 'Goggles' },
    { value: 'wings', label: 'Wings' },
    { value: 'armor', label: 'Armor' },
    { value: 'jetpack', label: 'Jetpack' },
  ]},
  { label: 'Companions', props: [
    { value: 'pet-dog', label: 'Pet Dog' },
    { value: 'pet-cat', label: 'Pet Cat' },
    { value: 'parrot', label: 'Parrot' },
    { value: 'dragon', label: 'Baby Dragon' },
    { value: 'robot-companion', label: 'Robot Buddy' },
    { value: 'owl', label: 'Owl' },
    { value: 'fairy', label: 'Fairy Companion' },
  ]},
];

export const ALL_PROPS = PROP_CATEGORIES.flatMap(c => c.props);

export const NEG_PROMPT_CATEGORIES = [
  { label: 'Quality Issues', prompts: [
    { value: 'blurry', label: 'Blurry' },
    { value: 'low-quality', label: 'Low Quality' },
    { value: 'pixelated', label: 'Pixelated' },
    { value: 'noise', label: 'Noise/Grain' },
    { value: 'jpeg-artifacts', label: 'JPEG Artifacts' },
    { value: 'watermark', label: 'Watermark' },
    { value: 'text', label: 'Text/Letters' },
    { value: 'signature', label: 'Signature' },
  ]},
  { label: 'Anatomy & Body', prompts: [
    { value: 'extra-limbs', label: 'Extra Limbs' },
    { value: 'deformed-hands', label: 'Deformed Hands' },
    { value: 'extra-fingers', label: 'Extra Fingers' },
    { value: 'missing-fingers', label: 'Missing Fingers' },
    { value: 'bad-anatomy', label: 'Bad Anatomy' },
    { value: 'disproportionate', label: 'Disproportionate' },
    { value: 'fused-limbs', label: 'Fused Limbs' },
    { value: 'duplicate-body-parts', label: 'Duplicate Body Parts' },
  ]},
  { label: 'Face & Expression', prompts: [
    { value: 'angry-emotions', label: 'Angry Emotions' },
    { value: 'sad-emotions', label: 'Sad Emotions' },
    { value: 'scared-emotions', label: 'Scared Emotions' },
    { value: 'crying', label: 'Crying' },
    { value: 'cross-eyed', label: 'Cross-Eyed' },
    { value: 'asymmetric-face', label: 'Asymmetric Face' },
    { value: 'ugly-face', label: 'Ugly/Distorted Face' },
    { value: 'dead-eyes', label: 'Dead/Lifeless Eyes' },
  ]},
  { label: 'Style & Composition', prompts: [
    { value: 'photorealistic', label: 'Photorealistic' },
    { value: 'cartoon', label: 'Cartoon' },
    { value: 'anime', label: 'Anime' },
    { value: 'nsfw', label: 'NSFW' },
    { value: 'violence', label: 'Violence/Gore' },
    { value: 'dark-theme', label: 'Dark/Horror Theme' },
    { value: 'cluttered-bg', label: 'Cluttered Background' },
    { value: 'cropped', label: 'Cropped/Cut Off' },
  ]},
  { label: 'Consistency', prompts: [
    { value: 'inconsistent-outfit', label: 'Outfit Changes' },
    { value: 'color-shifts', label: 'Color Shifts' },
    { value: 'inconsistent-proportions', label: 'Proportion Changes' },
    { value: 'style-mixing', label: 'Mixed Art Styles' },
    { value: 'different-characters', label: 'Different Characters' },
    { value: 'age-changes', label: 'Age Variations' },
  ]},
];

export const ALL_NEG_PROMPTS = NEG_PROMPT_CATEGORIES.flatMap(c => c.prompts);

/** Convert selected prop values to label strings */
export function getPropsLabels(selectedProps) {
  return selectedProps.map(p => ALL_PROPS.find(o => o.value === p)?.label || p);
}

/** Convert selected neg pill values to label strings and combine with freetext */
export function getCombinedNegativePrompt(selectedNegPills, freetext = '') {
  const labels = selectedNegPills.map(v => ALL_NEG_PROMPTS.find(o => o.value === v)?.label || v);
  return [
    ...labels,
    ...(freetext.trim() ? [freetext.trim()] : []),
  ].join(', ') || undefined;
}
