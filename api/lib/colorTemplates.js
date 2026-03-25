/**
 * Color templates for LinkedIn post image composition.
 * Pure data — no dependencies.
 */

export const TEMPLATES = [
  {
    name: 'arctic-steel',
    gradient: { stops: ['#0a1628', '#1e3a5f', '#94a3b8'], angle: 150 },
    orb: { color: '#64748b', centerY: 35 },
    pill: { fill: 'rgba(100,116,139,0.45)', stroke: 'rgba(100,116,139,0.5)' },
  },
  {
    name: 'sunset-coral',
    gradient: { stops: ['#1a0a1e', '#7c2d5f', '#f97316'], angle: 135 },
    orb: { color: '#f97316', centerY: 60 },
    pill: { fill: 'rgba(249,115,22,0.4)', stroke: 'rgba(249,115,22,0.45)' },
  },
  {
    name: 'electric-violet',
    gradient: { stops: ['#0a0020', '#4a00b4', '#bf5af2'], angle: 140 },
    orb: { color: '#bf5af2', centerY: 45 },
    pill: { fill: 'rgba(191,90,242,0.4)', stroke: 'rgba(191,90,242,0.45)' },
  },
  {
    name: 'royal-gold',
    gradient: { stops: ['#1a0a2e', '#44337a', '#d69e2e'], angle: 140 },
    orb: { color: '#d69e2e', centerY: 55 },
    pill: { fill: 'rgba(214,158,46,0.4)', stroke: 'rgba(214,158,46,0.45)' },
  },
  {
    name: 'midnight-rose',
    gradient: { stops: ['#0f0c29', '#302b63', '#e44d7b'], angle: 140 },
    orb: { color: '#ec4899', centerY: 70 },
    pill: { fill: 'rgba(236,72,153,0.4)', stroke: 'rgba(236,72,153,0.45)' },
  },
  {
    name: 'purple-burst',
    gradient: { stops: ['#1a0a3e', '#3b1c8c', '#0ea5e9'], angle: 145 },
    orb: { color: '#7c3aed', centerY: 30 },
    pill: { fill: 'rgba(124,58,237,0.45)', stroke: 'rgba(124,58,237,0.5)' },
  },
];

/**
 * Returns the template for a given post number (1-indexed, cycles through 6).
 * @param {number} postNumber
 * @returns {object}
 */
export function getTemplate(postNumber) {
  return TEMPLATES[(postNumber - 1) % TEMPLATES.length];
}
