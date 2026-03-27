/**
 * Turnaround Pose Set Presets
 *
 * SYNC NOTE: Frontend mirror at src/lib/turnaroundPoseSets.js must stay in sync.
 *
 * Grid dimensions are derived from the data:
 *   cols = rows[0].cells.length
 *   rowCount = rows.length
 *
 * Legacy sets are 4×6 (24 cells). New 3D-optimized sets are 2×2 (4 cells)
 * for dramatically higher per-cell resolution.
 *
 * Each cell has:
 *   - prompt: descriptive text injected into the generation prompt
 *   - shortLabel: compact label for grid overlay, cell editor, and library titles
 */

export const POSE_SETS = [
  {
    id: '3d-angles',
    name: '3D Reference — Angles',
    description: '4 high-resolution orthographic views optimized for 3D model generation',
    thumbnail: '/assets/pose-sets/3d-angles.svg',
    rows: [
      {
        label: 'Front & Right Side',
        cells: [
          { prompt: 'front view, full body, standing neutral A-pose with arms slightly away from body, orthographic flat angle, centered in frame, full character visible head to toe', shortLabel: 'Front' },
          { prompt: 'right side profile view, full body, standing neutral pose, orthographic flat angle, centered in frame, full character visible head to toe', shortLabel: 'Right' },
        ],
      },
      {
        label: 'Back & Left Side',
        cells: [
          { prompt: 'back view, full body, standing neutral pose, orthographic flat angle, centered in frame, full character visible head to toe', shortLabel: 'Back' },
          { prompt: 'left side profile view, full body, standing neutral pose, orthographic flat angle, centered in frame, full character visible head to toe', shortLabel: 'Left' },
        ],
      },
    ],
  },
  {
    id: '3d-action',
    name: '3D Reference — Action',
    description: '4 high-resolution action poses for 3D rigging and animation reference',
    thumbnail: '/assets/pose-sets/3d-action.svg',
    rows: [
      {
        label: 'Dynamic Front Views',
        cells: [
          { prompt: 'three-quarter front view, dynamic action stance, weight shifted forward, full body, centered in frame', shortLabel: '3/4 Action' },
          { prompt: 'side profile, running mid-stride or combat pose, full body, centered in frame', shortLabel: 'Side Action' },
        ],
      },
      {
        label: 'Dynamic Rear & Special',
        cells: [
          { prompt: 'three-quarter back view, action stance with arms raised, full body, centered in frame', shortLabel: '3/4 Back Action' },
          { prompt: 'dramatic low angle hero landing pose, full body, centered in frame', shortLabel: 'Hero Pose' },
        ],
      },
    ],
  },
  {
    id: 'standard-24',
    name: 'Standard 24',
    description: 'Classic turnaround with expressions, walk cycles, action, and detail views',
    thumbnail: '/assets/pose-sets/standard-24.svg',
    rows: [
      {
        label: 'Turnaround (Neutral Standing)',
        cells: [
          { prompt: 'front view', shortLabel: 'Front' },
          { prompt: 'three-quarter front view', shortLabel: '3/4 Front' },
          { prompt: 'side profile view', shortLabel: 'Side' },
          { prompt: 'back view', shortLabel: 'Back' },
        ],
      },
      {
        label: 'Expressions & Alternative Back',
        cells: [
          { prompt: 'three-quarter back view', shortLabel: '3/4 Back' },
          { prompt: 'neutral expression close-up', shortLabel: 'Neutral' },
          { prompt: 'determined expression', shortLabel: 'Determined' },
          { prompt: 'joyful laughing expression', shortLabel: 'Joyful' },
        ],
      },
      {
        label: 'Walk Cycles',
        cells: [
          { prompt: 'walk cycle pose A (left foot forward)', shortLabel: 'Walk A' },
          { prompt: 'walk cycle pose B (right foot forward)', shortLabel: 'Walk B' },
          { prompt: 'walking toward viewer', shortLabel: 'Walk Toward' },
          { prompt: 'walking away', shortLabel: 'Walk Away' },
        ],
      },
      {
        label: 'Dynamic & Action',
        cells: [
          { prompt: 'running side view', shortLabel: 'Running' },
          { prompt: 'jumping with arms raised', shortLabel: 'Jumping' },
          { prompt: 'dynamic hero landing pose', shortLabel: 'Hero Land' },
          { prompt: 'fighting/action stance', shortLabel: 'Fight Stance' },
        ],
      },
      {
        label: 'Still Poses & Interaction',
        cells: [
          { prompt: 'sitting cross-legged', shortLabel: 'Sitting' },
          { prompt: 'reaching hand outward', shortLabel: 'Reaching' },
          { prompt: 'carrying an object', shortLabel: 'Carrying' },
          { prompt: 'leaning against wall casually', shortLabel: 'Leaning' },
        ],
      },
      {
        label: 'Special Views & Details',
        cells: [
          { prompt: 'face close-up head and shoulders', shortLabel: 'Face Detail' },
          { prompt: 'hand and accessory detail close-up', shortLabel: 'Hand Detail' },
          { prompt: 'bird\'s-eye view from above', shortLabel: 'Top-Down' },
          { prompt: 'dramatic low angle from below', shortLabel: 'Low Angle' },
        ],
      },
    ],
  },
  {
    id: 'expressions-focus',
    name: 'Expressions Focus',
    description: 'Heavy on facial emotion — 16 expression cells plus turnaround and detail',
    thumbnail: '/assets/pose-sets/expressions-focus.svg',
    rows: [
      {
        label: 'Turnaround (Neutral Standing)',
        cells: [
          { prompt: 'front view', shortLabel: 'Front' },
          { prompt: 'three-quarter front view', shortLabel: '3/4 Front' },
          { prompt: 'side profile view', shortLabel: 'Side' },
          { prompt: 'back view', shortLabel: 'Back' },
        ],
      },
      {
        label: 'Core Expressions',
        cells: [
          { prompt: 'happy smiling expression', shortLabel: 'Happy' },
          { prompt: 'sad melancholic expression', shortLabel: 'Sad' },
          { prompt: 'angry furious expression', shortLabel: 'Angry' },
          { prompt: 'surprised shocked expression', shortLabel: 'Surprised' },
        ],
      },
      {
        label: 'Complex Expressions',
        cells: [
          { prompt: 'scared frightened expression', shortLabel: 'Scared' },
          { prompt: 'disgusted repulsed expression', shortLabel: 'Disgusted' },
          { prompt: 'smug self-satisfied expression', shortLabel: 'Smug' },
          { prompt: 'crying with tears expression', shortLabel: 'Crying' },
        ],
      },
      {
        label: 'Subtle Expressions',
        cells: [
          { prompt: 'bored uninterested expression', shortLabel: 'Bored' },
          { prompt: 'curious intrigued expression', shortLabel: 'Curious' },
          { prompt: 'suspicious doubtful expression', shortLabel: 'Suspicious' },
          { prompt: 'embarrassed blushing expression', shortLabel: 'Embarrassed' },
        ],
      },
      {
        label: 'Interaction Expressions',
        cells: [
          { prompt: 'laughing with someone expression', shortLabel: 'Laughing' },
          { prompt: 'whispering secretive expression', shortLabel: 'Whispering' },
          { prompt: 'shouting yelling expression', shortLabel: 'Shouting' },
          { prompt: 'eye-roll annoyed expression', shortLabel: 'Eye-Roll' },
        ],
      },
      {
        label: 'Detail Close-ups',
        cells: [
          { prompt: 'face close-up front view', shortLabel: 'Face Front' },
          { prompt: 'face close-up three-quarter view', shortLabel: 'Face 3/4' },
          { prompt: 'eyes extreme close-up', shortLabel: 'Eyes Detail' },
          { prompt: 'mouth and chin detail close-up', shortLabel: 'Mouth Detail' },
        ],
      },
    ],
  },
  {
    id: 'action-heavy',
    name: 'Action Heavy',
    description: 'Combat, dynamic movement, and power poses for action characters',
    thumbnail: '/assets/pose-sets/action-heavy.svg',
    rows: [
      {
        label: 'Turnaround (Neutral Standing)',
        cells: [
          { prompt: 'front view', shortLabel: 'Front' },
          { prompt: 'three-quarter front view', shortLabel: '3/4 Front' },
          { prompt: 'side profile view', shortLabel: 'Side' },
          { prompt: 'back view', shortLabel: 'Back' },
        ],
      },
      {
        label: 'Combat Stances',
        cells: [
          { prompt: 'sword swing attack pose', shortLabel: 'Sword Swing' },
          { prompt: 'dodge roll evasion pose', shortLabel: 'Dodge Roll' },
          { prompt: 'shield block defensive pose', shortLabel: 'Shield Block' },
          { prompt: 'high kick attack pose', shortLabel: 'Kick' },
        ],
      },
      {
        label: 'Movement',
        cells: [
          { prompt: 'full sprint running pose', shortLabel: 'Sprint' },
          { prompt: 'crouching stealth pose', shortLabel: 'Crouch' },
          { prompt: 'climbing wall pose', shortLabel: 'Climb' },
          { prompt: 'backflip mid-air pose', shortLabel: 'Backflip' },
        ],
      },
      {
        label: 'Power Moves',
        cells: [
          { prompt: 'dual-wield attack pose', shortLabel: 'Dual-Wield' },
          { prompt: 'power-up energy charge pose', shortLabel: 'Power-Up' },
          { prompt: 'ground slam impact pose', shortLabel: 'Ground Slam' },
          { prompt: 'aerial strike diving attack pose', shortLabel: 'Aerial Strike' },
        ],
      },
      {
        label: 'States',
        cells: [
          { prompt: 'injured kneeling pose', shortLabel: 'Injured' },
          { prompt: 'victory celebration pose', shortLabel: 'Victory' },
          { prompt: 'defeated fallen pose', shortLabel: 'Defeated' },
          { prompt: 'battle-ready stance', shortLabel: 'Battle-Ready' },
        ],
      },
      {
        label: 'Detail Close-ups',
        cells: [
          { prompt: 'face with battle expression close-up', shortLabel: 'Battle Face' },
          { prompt: 'weapon grip detail close-up', shortLabel: 'Weapon Grip' },
          { prompt: 'dynamic low angle action shot', shortLabel: 'Low Angle' },
          { prompt: 'impact moment freeze frame', shortLabel: 'Impact' },
        ],
      },
    ],
  },
  {
    id: 'fashion-outfit',
    name: 'Fashion / Outfit',
    description: 'Clothing variations, seasonal outfits, accessory details, and styling poses',
    thumbnail: '/assets/pose-sets/fashion-outfit.svg',
    rows: [
      {
        label: 'Turnaround (Neutral Standing)',
        cells: [
          { prompt: 'front view', shortLabel: 'Front' },
          { prompt: 'three-quarter front view', shortLabel: '3/4 Front' },
          { prompt: 'side profile view', shortLabel: 'Side' },
          { prompt: 'back view', shortLabel: 'Back' },
        ],
      },
      {
        label: 'Outfit Variations',
        cells: [
          { prompt: 'casual everyday wear outfit', shortLabel: 'Casual' },
          { prompt: 'formal elegant wear outfit', shortLabel: 'Formal' },
          { prompt: 'sleepwear pajamas outfit', shortLabel: 'Sleepwear' },
          { prompt: 'athletic sportswear outfit', shortLabel: 'Athletic' },
        ],
      },
      {
        label: 'Seasonal',
        cells: [
          { prompt: 'winter coat and warm clothing outfit', shortLabel: 'Winter' },
          { prompt: 'summer light clothing outfit', shortLabel: 'Summer' },
          { prompt: 'rain gear umbrella outfit', shortLabel: 'Rain Gear' },
          { prompt: 'evening gala formal dress outfit', shortLabel: 'Evening' },
        ],
      },
      {
        label: 'Accessory Focus',
        cells: [
          { prompt: 'hat and headwear accessories close-up', shortLabel: 'Headwear' },
          { prompt: 'bag and backpack accessories', shortLabel: 'Bags' },
          { prompt: 'jewelry and accessories close-up', shortLabel: 'Jewelry' },
          { prompt: 'shoe and footwear detail close-up', shortLabel: 'Shoes' },
        ],
      },
      {
        label: 'Fabric & Fit',
        cells: [
          { prompt: 'back detail showing closure and stitching', shortLabel: 'Back Detail' },
          { prompt: 'fabric texture detail close-up', shortLabel: 'Texture' },
          { prompt: 'layered outfit showing all layers', shortLabel: 'Layered' },
          { prompt: 'outfit silhouette outline', shortLabel: 'Silhouette' },
        ],
      },
      {
        label: 'Styling Poses',
        cells: [
          { prompt: 'runway walk modeling pose', shortLabel: 'Runway' },
          { prompt: 'seated elegant pose', shortLabel: 'Seated' },
          { prompt: 'windswept dramatic pose', shortLabel: 'Windswept' },
          { prompt: 'mirror reflection full body', shortLabel: 'Mirror' },
        ],
      },
    ],
  },
  {
    id: 'creature-non-human',
    name: 'Creature / Non-Human',
    description: 'Animals, monsters, and mechs — creature-specific poses and anatomy details',
    thumbnail: '/assets/pose-sets/creature-non-human.svg',
    rows: [
      {
        label: 'Turnaround (Neutral Standing)',
        cells: [
          { prompt: 'front view', shortLabel: 'Front' },
          { prompt: 'three-quarter front view', shortLabel: '3/4 Front' },
          { prompt: 'side profile view', shortLabel: 'Side' },
          { prompt: 'back view', shortLabel: 'Back' },
        ],
      },
      {
        label: 'Creature Features',
        cells: [
          { prompt: 'wings spread extended pose', shortLabel: 'Wing Spread' },
          { prompt: 'coiled resting pose', shortLabel: 'Resting' },
          { prompt: 'roar threat display pose', shortLabel: 'Roar' },
          { prompt: 'tail poses various positions', shortLabel: 'Tail Poses' },
        ],
      },
      {
        label: 'Movement',
        cells: [
          { prompt: 'flight hover mid-air pose', shortLabel: 'Flight' },
          { prompt: 'swimming underwater pose', shortLabel: 'Swimming' },
          { prompt: 'burrowing digging pose', shortLabel: 'Burrowing' },
          { prompt: 'pounce leap attack pose', shortLabel: 'Pounce' },
        ],
      },
      {
        label: 'Interaction',
        cells: [
          { prompt: 'pack formation group pose', shortLabel: 'Pack' },
          { prompt: 'hunting stalking pose', shortLabel: 'Hunting' },
          { prompt: 'feeding eating pose', shortLabel: 'Feeding' },
          { prompt: 'playful friendly pose', shortLabel: 'Playful' },
        ],
      },
      {
        label: 'Detail Close-ups',
        cells: [
          { prompt: 'eye detail extreme close-up', shortLabel: 'Eye Detail' },
          { prompt: 'paw claw talon detail close-up', shortLabel: 'Claw Detail' },
          { prompt: 'scale fur feather texture close-up', shortLabel: 'Texture' },
          { prompt: 'teeth beak horn detail close-up', shortLabel: 'Teeth/Horn' },
        ],
      },
      {
        label: 'Special Views',
        cells: [
          { prompt: 'size comparison standing next to human', shortLabel: 'Size Compare' },
          { prompt: 'skeletal anatomy overlay view', shortLabel: 'Skeleton' },
          { prompt: 'baby juvenile version of creature', shortLabel: 'Baby' },
          { prompt: 'battle armored variant', shortLabel: 'Armored' },
        ],
      },
    ],
  },
];

export function getPoseSetById(id) {
  return POSE_SETS.find(p => p.id === id) || POSE_SETS[0];
}

export function listPoseSets() {
  return POSE_SETS.map(({ id, name, description, thumbnail }) => ({ id, name, description, thumbnail }));
}

/** Derive grid dimensions from a pose set's row/cell structure */
export function getPoseSetGrid(poseSetId) {
  const ps = getPoseSetById(poseSetId);
  const cols = ps.rows[0]?.cells.length || 4;
  const rows = ps.rows.length;
  return { cols, rows, total: cols * rows };
}
