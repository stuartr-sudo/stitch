/**
 * Brand Mode — Content strategy layer for brand content marketing.
 *
 * Adds a brand context injection to the production engine system prompt.
 * The brand name NEVER appears in generated content. The brand's expertise
 * is demonstrated through the quality of the insight, never stated.
 *
 * Used by: productionEngine.js, preview-script.js
 */

// ─── EMOTIONAL DRIVERS ──────────────────────────────────────────────────────

export const EMOTIONAL_DRIVERS = {

  // ── FEAR / LOSS AVERSION ──────────────────────────────────────────────
  // Kahneman's prospect theory: losses feel ~2x stronger than equivalent gains.
  fear: {
    name: 'Fear / Loss Aversion',
    description: 'Content that makes the viewer feel the weight of what they could lose. Cautionary tales, real consequences, hidden risks.',
    tension_mechanic: 'The viewer discovers a risk they didn\'t know existed. Each beat reveals the risk is bigger/closer than they thought. The climax shows the full consequence. The kicker makes it personal.',
    script_instruction: 'The story should follow a real or realistic scenario where things went wrong. Ground it in specific numbers, dates, and consequences. The viewer should finish thinking "that could be me." NEVER use generic fear-mongering — every claim must be factually grounded. The fear should feel like a revelation, not a threat.',
    pacing_note: 'Build dread gradually. The climax should hit like a gut punch. The kicker should be quiet and personal — not shouting.',
    failure_modes: [
      'Fear without specificity — "bad things can happen" means nothing',
      'Fear without a path forward — the viewer should feel motivated, not helpless',
      'Fear fatigue — if every video is scary, the audience stops watching',
      'Exaggeration that undermines credibility — stick to real cases and real numbers',
    ],
  },

  // ── IDENTITY / ASPIRATION ─────────────────────────────────────────────
  // Belk's self-concept theory: people buy the version of themselves they want to be.
  identity: {
    name: 'Identity / Aspiration',
    description: 'Content that makes the viewer categorize themselves and aspire to level up. The tension is self-recognition — "am I the amateur or the professional?"',
    tension_mechanic: 'The hook presents a dichotomy (two types of people, two approaches, two outcomes). The escalation reveals what separates them — and it\'s not what the viewer expects. The climax shows the specific behavior or decision that defines the professional. The kicker makes the viewer choose which side they\'re on.',
    script_instruction: 'Frame the content as a comparison between two approaches, two mindsets, or two types of people. NEVER be condescending about the "amateur" side — the viewer is probably there and you need them to feel motivated, not judged. The "professional" side should feel achievable, not elite. The brand\'s domain expertise should shine through the SPECIFICITY of the insight, not through self-promotion.',
    pacing_note: 'Conversational and confident. Not preachy. The dichotomy should feel like an observation, not a lecture.',
    failure_modes: [
      'Judging or shaming the viewer for being the "amateur" type',
      'Making the "professional" side feel unachievable',
      'Being vague about what actually differentiates the two types',
      'Sounding like a LinkedIn thought leader — be specific and grounded',
    ],
  },

  // ── CURIOSITY / EDUCATION ─────────────────────────────────────────────
  // Information gap theory (Loewenstein): curiosity is the discomfort of incomplete information.
  curiosity: {
    name: 'Curiosity / Education',
    description: 'Content that reveals something the viewer didn\'t know about the brand\'s domain. The tension is the information gap — "how is that possible?" or "why does it work that way?"',
    tension_mechanic: 'The hook presents a surprising or counterintuitive fact. The escalation peels back layers — each beat reveals a deeper level of "how this actually works." The climax delivers the full picture. The kicker reframes what the viewer thought they knew.',
    script_instruction: 'Lead with the most SURPRISING insight, not the most important one. The viewer needs to feel "wait, WHAT?" in the first 3 seconds. Then explain the mechanism clearly — the viewer should feel smarter by the end, not confused. Use analogies and specific examples. The brand\'s expertise is demonstrated through the DEPTH and ACCURACY of the explanation.',
    pacing_note: 'Moderate pace with strategic pauses for "aha" moments. Let the surprising facts land before moving on.',
    failure_modes: [
      'Starting with the obvious instead of the surprising',
      'Explaining without grounding in specific examples',
      'Being so educational it feels like a lecture — maintain conversational tone',
      'Not connecting the knowledge back to the viewer\'s life',
    ],
  },

  // ── INJUSTICE / MORAL OUTRAGE ─────────────────────────────────────────
  // Moral foundations theory (Haidt): fairness/cheating is a universal trigger.
  injustice: {
    name: 'Injustice / Moral Outrage',
    description: 'Content that exposes something unfair in the brand\'s domain. The tension is moral — "this shouldn\'t be happening." Extremely shareable because people want others to know.',
    tension_mechanic: 'The hook presents a fact that feels wrong. The escalation reveals the system or structure that allows it. The climax shows who benefits and who loses. The kicker makes the viewer feel empowered to respond differently.',
    script_instruction: 'Ground EVERY claim in verifiable facts. Injustice content that exaggerates or manipulates destroys brand credibility permanently. The outrage must be EARNED through evidence, not manufactured through rhetoric. Show the specific mechanism of unfairness — who profits, who pays, how the system enables it. The viewer should finish feeling informed and empowered, not just angry.',
    pacing_note: 'Measured and deliberate. Each piece of evidence should land with weight. Don\'t rush the moral argument — let the viewer arrive at the conclusion themselves.',
    failure_modes: [
      'Manufacturing outrage without evidence',
      'Punching down — always punch up at systems/institutions, never at individuals',
      'Leaving the viewer feeling helpless instead of empowered',
      'Being preachy — present the facts and let the viewer feel the injustice themselves',
    ],
  },

  // ── WONDER / AWE ──────────────────────────────────────────────────────
  // Keltner & Haidt's awe research: awe increases generosity and creates lasting positive brand association.
  wonder: {
    name: 'Wonder / Awe',
    description: 'Content that makes the viewer marvel at something in the brand\'s domain. The tension is fascination — "how is this possible?" driven by wonder rather than confusion.',
    tension_mechanic: 'The hook presents something beautiful, extraordinary, or almost impossible to believe. The escalation reveals the mechanism behind the wonder — each layer should deepen the awe, not diminish it. The climax shows the full scale or implications. The kicker connects the wonder to the viewer\'s own life.',
    script_instruction: 'Lead with the most awe-inspiring detail. Use sensory language — make the viewer SEE, FEEL, or HEAR the wonder. The explanation of HOW it works should INCREASE the awe, not reduce it to mundane mechanics. The brand\'s domain expertise shines through the depth of understanding — showing the viewer something beautiful that only an expert would know to look for.',
    pacing_note: 'Slower than other drivers. Give awe moments room to breathe. Don\'t rush past the beautiful details.',
    failure_modes: [
      'Explaining away the wonder — the mechanism should be MORE amazing than the surface',
      'Being too abstract — ground the awe in specific, concrete details',
      'No personal connection — "cool fact" isn\'t enough, connect it to the viewer\'s experience',
      'Overusing superlatives — "the most amazing thing ever" means nothing. Show, don\'t label.',
    ],
  },
};

// ─── BRAND CONTEXT BUILDER ──────────────────────────────────────────────────

/**
 * Build the brand context section for the production engine system prompt.
 * This is injected AFTER the niche blueprint section.
 */
export function buildBrandContextSection(brand, selectedAngle, emotionalDriverKey) {
  const driver = EMOTIONAL_DRIVERS[emotionalDriverKey];
  if (!driver) throw new Error(`Unknown emotional driver: ${emotionalDriverKey}`);

  // Use per-angle endpoint if available, fall back to brand-level
  const endpoint = selectedAngle.endpoint || brand.emotional_endpoint;

  return `
═══ BRAND CONTENT MODE ═══

You are generating content for a brand's editorial/educational channel.
THIS IS NOT AN AD. The brand is NEVER mentioned. No logo. No CTA. No product pitch.

The viewer should finish this video having learned something genuinely useful
and feeling a specific emotion — not feeling like they were marketed to.

BRAND DOMAIN (shapes the DEPTH of your knowledge): ${brand.brand_domain}
BRAND EXPERTISE (you know THIS domain deeply): ${brand.brand_expertise}

TARGET VIEWER: ${brand.target_viewer}
The content must feel like it was made FOR this specific person.
Use their language. Reference their world. Make them feel seen.

VIEWER PAIN POINTS (problems they face that they may not have articulated):
${brand.target_viewer_pain_points.map(p => `- ${p}`).join('\n')}

═══ CONTENT ANGLE: ${selectedAngle.name} ═══

EMOTIONAL DRIVER: ${driver.name}
${driver.description}

TENSION MECHANIC:
${driver.tension_mechanic}

SCRIPT INSTRUCTION:
${driver.script_instruction}

PACING NOTE:
${driver.pacing_note}

ANGLE-SPECIFIC FAILURE MODES:
${driver.failure_modes.map(f => `- ${f}`).join('\n')}

HOOK PATTERNS FOR THIS ANGLE (use as inspiration, create your own):
${(selectedAngle.hook_patterns || []).map(h => `- "${h}"`).join('\n')}

EMOTIONAL ENDPOINT (the viewer should finish feeling this):
"${endpoint}"

${brand.voice_samples && brand.voice_samples.length > 0 ? `
═══ BRAND VOICE SAMPLES (match this tone and style) ═══
${brand.voice_samples.map((s, i) => `Sample ${i + 1}: "${s}"`).join('\n')}
` : ''}

═══ HARD RULES (VIOLATING THESE IS A CRITICAL FAILURE) ═══
- The brand name "${brand.brand_name}" must NEVER appear in the script. Not once.
- No logos, no product names, no CTAs, no "learn more at", no "link in bio"
- No direct selling language — "you should buy", "get started with", "sign up for"
- The content must be genuinely useful even if the viewer never becomes a customer
- Every claim must be factually grounded — brand content credibility is everything
${(brand.hard_rules || []).map(r => `- ${r}`).join('\n')}

═══ WHAT MAKES THIS BRAND CONTENT, NOT AN AD ═══
The brand's expertise is DEMONSTRATED through the quality of the insight, never stated.
The viewer should walk away associating the brand with deep domain expertise —
which is worth more than any CTA. The content does the selling by being so good
that the viewer trusts the source.`;
}

// ─── CONTENT ANGLE ROTATION ─────────────────────────────────────────────────

/**
 * Select the next content angle based on weight-proportional rotation.
 * Prevents over-indexing on any single emotional driver.
 */
export function selectNextAngle(brand, recentTopics = []) {
  const angles = brand.content_angles || [];
  if (angles.length === 0) return null;
  if (angles.length === 1) return angles[0];

  const totalWeight = angles.reduce((sum, a) => sum + (a.weight || 1), 0);
  const totalRecent = recentTopics.length || 1;

  // Count recent usage per angle
  const recentCounts = {};
  for (const angle of angles) {
    recentCounts[angle.id] = recentTopics.filter(t => t.content_angle_id === angle.id).length;
  }

  // Find the most underrepresented angle
  let maxDeficit = -Infinity;
  let selected = angles[0];

  for (const angle of angles) {
    const targetPct = (angle.weight || 1) / totalWeight;
    const actualPct = (recentCounts[angle.id] || 0) / totalRecent;
    const deficit = targetPct - actualPct;
    if (deficit > maxDeficit) {
      maxDeficit = deficit;
      selected = angle;
    }
  }

  return selected;
}

// ─── POST-GENERATION VALIDATION ─────────────────────────────────────────────

const CTA_PATTERNS = [
  'link in bio', 'sign up', 'get started', 'learn more at', 'visit our',
  'check out our', 'subscribe to', 'follow us', 'join our', 'download our',
  'use code', 'promo code', 'discount', 'free trial', 'click the link',
  'tap the link', 'head to our', 'available at', 'shop now', 'buy now',
  'order now', 'get yours', 'limited time', 'act now', 'don\'t miss',
];

const SELLING_PATTERNS = [
  'our product', 'our service', 'our platform', 'our solution', 'our tool',
  'our app', 'our team', 'our company', 'we offer', 'we provide',
  'we built', 'we created', 'we designed', 'we help', 'we make',
  'you should buy', 'you should try', 'you should use',
];

/**
 * Scan generated narration for brand mode violations.
 * Returns an array of violation objects.
 */
export function validateBrandContent(narrationFull, brandName) {
  const violations = [];
  const lower = narrationFull.toLowerCase();

  // Check for brand name mention
  if (lower.includes(brandName.toLowerCase())) {
    violations.push({
      type: 'brand_name',
      severity: 'critical',
      message: `Brand name "${brandName}" appears in the script. This must be removed.`,
      match: brandName,
    });
  }

  // Check for CTA patterns
  for (const pattern of CTA_PATTERNS) {
    if (lower.includes(pattern)) {
      violations.push({
        type: 'cta',
        severity: 'critical',
        message: `CTA language detected: "${pattern}". Brand content must not contain CTAs.`,
        match: pattern,
      });
    }
  }

  // Check for selling language
  for (const pattern of SELLING_PATTERNS) {
    if (lower.includes(pattern)) {
      violations.push({
        type: 'selling',
        severity: 'warning',
        message: `Selling language detected: "${pattern}". Brand content should not reference the brand directly.`,
        match: pattern,
      });
    }
  }

  return violations;
}
