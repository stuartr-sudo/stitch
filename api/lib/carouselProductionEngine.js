/**
 * Carousel Production Engine
 *
 * Generates engaging carousel slide content using the same craft-driven approach
 * as the Shorts Production Engine and LinkedIn Production Engine. Uses Claude
 * Sonnet 4.6 with engagement psychology, emotional drivers, narrative arc
 * design, curiosity-gap headlines, and deep brand integration.
 *
 * Replaces the old 2-stage GPT pipeline (synthesizeResearch → writeSlides)
 * with a single-pass Claude engine that produces psychologically grounded,
 * engagement-optimised carousel content.
 *
 * Used by: api/carousel/generate-content.js
 */

import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { logCost } from './costLogger.js';
import { EMOTIONAL_DRIVERS, buildBrandContextSection, validateBrandContent } from './brandMode.js';
import { BRAND_WRITING_PRINCIPLES } from './brandWritingPrinciples.js';

// ─── ZOD SCHEMA ────────────────────────────────────────────────────────────

const CarouselSlide = z.object({
  slide_type: z.enum(['hook', 'story', 'conclusion']).describe('Slide role in the narrative arc'),
  headline: z.string().describe('Bold text on the slide. Hook: 3-8 words max, creates an information gap. Story: the claim or revelation, max 10 words. Conclusion: the takeaway reframe, max 8 words.'),
  body_text: z.string().describe('Supporting text. Hook slides: empty string "". Story slides: 1-2 sentences of specific evidence. Conclusion: 1 sentence call to action or reframe.'),
  image_prompt: z.string().describe('Background image generation prompt. 20-40 words. Describes the SAME physical environment from a different camera angle. Physical objects + lighting + camera angle only. Never include artistic style, text, or abstract concepts.'),
  tension_note: z.string().describe('Internal note: what tension does this slide create or resolve? Why would someone swipe to the next slide?'),
});

const CarouselPackageSchema = z.object({
  narrative_strategy: z.object({
    thesis: z.string().describe('The ONE core argument this carousel makes (1 sentence)'),
    tension: z.string().describe('What contradiction, gap, or stakes drive the narrative forward? (1 sentence)'),
    arc_type: z.enum(['revelation', 'escalation', 'transformation', 'accumulation', 'inversion']).describe('The story shape'),
    driver: z.enum(['fear', 'identity', 'curiosity', 'injustice', 'wonder']).describe('Primary emotional driver for the carousel'),
  }),
  visual_world: z.string().describe('The ONE physical environment for all slide backgrounds. Concrete objects, lighting, atmosphere. 1-2 sentences. NOT artistic style.'),
  slides: z.array(CarouselSlide).min(5).max(12).describe('The carousel slides in order. First slide is always hook, last is always conclusion.'),
  caption_text: z.string().describe('Social media caption that EXPANDS on the slides. Not a summary. Include details that did not fit on slides. Platform-appropriate length and tone.'),
  image_hook: z.string().describe('3-8 word curiosity line for the HOOK slide image overlay. Creates an information gap. NOT a summary. The reader should think "WHAT?" or "HOW?" or "WAIT—"'),
});

// ─── ARC TYPES ────────────────────────────────────────────────────────────

const ARC_TYPES = {
  revelation: {
    name: 'Revelation Arc',
    description: 'Each slide peels back a layer. The reader thinks they understand, then the next slide reframes everything.',
    pacing: 'Slow build → accelerating reveals → perspective-shifting close',
    slide_guidance: 'Hook sets up the familiar framing. Each story slide adds a fact that subtly shifts the picture. By slide 5-6, what seemed simple is now complex. Conclusion reframes the hook.',
  },
  escalation: {
    name: 'Escalation Arc',
    description: 'Stakes get higher with every slide. Each fact is more surprising than the last.',
    pacing: 'Start surprising → get more surprising → peak at the second-to-last slide → quiet close',
    slide_guidance: 'Hook names the territory. Each story slide ups the stakes — bigger numbers, worse consequences, more shocking examples. The conclusion is deliberately quiet against the escalation.',
  },
  transformation: {
    name: 'Transformation Arc',
    description: 'Before/after with the mechanism in between. How something changed and why it matters.',
    pacing: 'Establish "before" → the turning point → the mechanism → the "after" → what it means',
    slide_guidance: 'Hook captures the before state vividly. Story slides walk through the change with specifics. The mechanism (how/why) is the most important slide. Conclusion shows the after and makes it personal.',
  },
  accumulation: {
    name: 'Accumulation Arc',
    description: 'Evidence stacked until the weight is undeniable. Each slide adds another proof point.',
    pacing: 'Statement → proof → proof → proof → proof → so what?',
    slide_guidance: 'Hook makes a claim that feels too strong. Each story slide is a separate piece of evidence. They should come from different angles (data, story, example, comparison). Conclusion asks "what do we do with this?"',
  },
  inversion: {
    name: 'Inversion Arc',
    description: 'Start with what everyone believes. End with the opposite being true.',
    pacing: 'Common belief → cracks appear → the turn → the reality → new lens',
    slide_guidance: 'Hook states the conventional wisdom as if it is true. Early story slides seem to confirm it. Then a slide introduces the crack. Remaining slides show why the opposite is true. Conclusion gives the reader a new lens.',
  },
};

// ─── PLATFORM CONFIG ──────────────────────────────────────────────────────

const PLATFORM_CONFIG = {
  instagram: {
    slideRange: '7-10',
    textDensity: 'Punchy headlines, 1-2 sentence bodies max. Big text energy.',
    captionGuidance: '150-250 words. Personal voice. End with a question that invites comments. 5-10 hashtags at the end.',
    audienceNote: 'Visual-first audience. They swipe fast. Every slide must EARN the next swipe in under 2 seconds.',
  },
  linkedin: {
    slideRange: '7-10',
    textDensity: 'Higher text density acceptable. Professionals will read 2-3 sentences per slide.',
    captionGuidance: '200-400 words. Professional but human. End with a question worth discussing. Max 3 hashtags.',
    audienceNote: 'Professional audience seeking insights. They want to feel smarter. Go deeper on evidence and implications.',
  },
  tiktok: {
    slideRange: '5-8',
    textDensity: 'Minimal. 5-8 words per slide max. BIG bold text only.',
    captionGuidance: '50-100 words. Casual, direct. No corporate language.',
    audienceNote: 'Fast-scrolling audience. You have 1 second to hook them. Slides should be readable at 2x speed.',
  },
  facebook: {
    slideRange: '5-8',
    textDensity: 'Medium. Clear headlines, short bodies.',
    captionGuidance: '100-200 words. Conversational. End with something shareable.',
    audienceNote: 'Broad audience. Shareability matters. The reader should think "my friend needs to see this."',
  },
};

// ─── SYSTEM PROMPT BUILDER ────────────────────────────────────────────────

function buildCarouselSystemPrompt(platform, stylePreset, brandContextSection) {
  const platformInfo = PLATFORM_CONFIG[platform] || PLATFORM_CONFIG.instagram;

  return `You are a carousel content engine. You create carousels that people don't just read — they swipe through compulsively, screenshot individual slides, and share with their network.

You are NOT a content template machine. You are NOT a "5 tips for X" generator. You create NARRATIVES told across slides — each slide is a beat in a story that builds tension, delivers revelations, and leaves the reader changed.

═══ THE SWIPE — YOUR #1 CONSTRAINT ═══

A carousel lives or dies by ONE metric: does the reader swipe to the next slide?

Every slide must create enough tension, curiosity, or anticipation that NOT swiping feels like walking out of a movie at the climax. If any single slide feels complete — if the reader thinks "ok, I get it" — the carousel is dead.

WHAT MAKES SOMEONE SWIPE:
- An incomplete thought: the headline sets up, the next slide delivers
- A number that needs explaining: "73% get this wrong" (wrong how?)
- A contradiction: "This is the safest investment. It destroyed $2.1 trillion."
- A cliffhanger: "Then they checked the data."
- An escalation: each slide more surprising than the last
- A pattern: the reader starts to see where this is going and wants to confirm

WHAT KILLS THE SWIPE:
- Self-contained slides: if deleting a slide doesn't hurt the story, it shouldn't exist
- Generic advice: "Be consistent", "Focus on value" (nothing the reader hasn't heard 100 times)
- Filler slides: repeating what the previous slide said in different words
- Abstract claims without specific evidence
- Every slide starting the same way (varied rhythm matters)

═══ SLIDE RULES ═══

There are ONLY 3 slide types — every slide uses the same visual layout, just different content:

1. "hook" (Slide 1 only):
   - headline: The scroll-stopper. 3-8 words MAX. Creates an information gap that DEMANDS the swipe.
   - body_text: Empty string "". The hook has no body. The image and headline do all the work.
   - This slide alone determines if someone enters the carousel or keeps scrolling.

2. "story" (All middle slides):
   - headline: The key claim, revelation, or beat of this point. Max 10 words.
   - body_text: The specific evidence — a number, a name, a concrete detail. 1-2 sentences.
   - Each story slide advances the narrative ONE beat. It reveals something new AND creates tension for the next slide.

3. "conclusion" (Final slide only):
   - headline: The reframe or call to action. Max 8 words.
   - body_text: One sentence. What should the reader think, feel, or do differently?
   - The conclusion must RECONTEXTUALIZE the hook. If someone re-reads slide 1 after slide 10, it should mean something different.

═══ HEADLINE CRAFT — CURIOSITY OVER INFORMATION ═══

Slide headlines are NOT informational headers. They are CURIOSITY TRIGGERS.

BAD headlines (inform, don't intrigue):
- "The Benefits of Morning Exercise" → tells you what to expect, no reason to swipe
- "5 Key Marketing Metrics" → category label, not a story
- "Why Sleep Matters" → everyone already agrees, zero tension
- "Step 3: Optimize Your Funnel" → instruction manual energy

GOOD headlines (create gaps, build tension):
- "Then they checked the data." → what did they find??
- "73% of teams skip this." → am I in the 73%?
- "$4.2 million. Gone in 3 hours." → how?!
- "The part nobody mentions." → what part??
- "It gets worse." → escalation, must know
- "That's the wrong question." → what's the right one?

Headlines should make someone's thumb STOP mid-scroll. They should create the feeling of "I need to see the next slide."

═══ NARRATIVE ARCS ═══

Every carousel follows one narrative arc. Choose based on the source material:

${Object.entries(ARC_TYPES).map(([key, a]) => `${a.name.toUpperCase()} (${key}):
${a.description}
Pacing: ${a.pacing}
Slide guidance: ${a.slide_guidance}`).join('\n\n')}

═══ EMOTIONAL DRIVERS ═══

Every engaging carousel triggers one primary emotional driver. Choose deliberately.

FEAR / LOSS AVERSION (fear):
The reader discovers a risk they didn't know existed. Use for: cautionary data, hidden costs, things people are doing wrong.
Carousel pacing: slow build with each slide adding another layer of "oh no."

IDENTITY / ASPIRATION (identity):
The reader categorises themselves. Use for: professional development, best practices, skill gaps.
Carousel pacing: establish the dichotomy early, spend most slides deepening one side.

CURIOSITY / EDUCATION (curiosity):
An information gap that MUST be filled. Use for: counterintuitive findings, how things work, surprising data.
Carousel pacing: accelerate — each slide widens the gap until the payoff.

INJUSTICE / MORAL OUTRAGE (injustice):
Something unfair exposed. Use for: industry problems, systemic issues, transparency.
Carousel pacing: accumulate evidence until the unfairness is undeniable. Punch UP.

WONDER / AWE (wonder):
Something remarkable revealed. Use for: innovations, achievements, elegant solutions.
Carousel pacing: breathe — let the remarkable details land. Don't rush.

═══ IMAGE PROMPTS — ONE WORLD, MANY ANGLES ═══

ALL slides share ONE visual world — the same physical environment. You vary ONLY the camera angle.

Think of it as a single photo shoot. The photographer doesn't leave the room between slides. They just move the camera: wide establishing shot, medium, close-up of a detail, overhead, eye-level, extreme close-up.

Rules:
- ALL prompts describe the EXACT SAME physical environment
- Vary ONLY: camera angle, focus point, compositional framing
- Do NOT introduce new locations, objects, or settings between slides
- NEVER include artistic style, medium, or aesthetic (no "watercolor", "cinematic", "illustration")
- NEVER describe text, overlays, UI elements, or typography
- NEVER use abstract concepts ("innovation", "growth", "success") — only physical, filmable things
- 20-40 words per prompt. Start with the environment, end with the camera angle.
${stylePreset ? `\n- STYLE HINT: The visual style will be "${stylePreset}". Choose an environment and lighting that harmonise with this aesthetic — but do NOT describe the style itself.` : ''}

═══ IMAGE HOOK — THE CURIOSITY TRIGGER ═══

The image_hook appears on the HOOK slide as text overlay. It is NOT a summary. It is a 3-8 word CURIOSITY GAP.

GOOD: "The math doesn't work.", "Nobody talks about this.", "3 words. $4.2 million."
BAD: "5 Tips for Better Marketing", "Key AI Trends for 2026", "How to Improve Your Workflow"

The image hook makes the reader's brain say "WHAT?" or "HOW?" or "WAIT—"

═══ WRITING RULES ═══

MANDATORY — violating these means the output fails:
- ZERO filler: "In today's world", "Let's dive in", "Here's the thing", "Did you know"
- ZERO hedging: "might", "could potentially", "it's possible that"
- ZERO AI clichés: "landscape", "navigate", "leverage", "robust", "delve", "tapestry", "game-changer", "revolutionize", "unlock", "supercharge", "empower", "elevate", "seamless", "cutting-edge"
- ZERO emojis in slide text (captions can have them sparingly)
- ZERO em dashes (—) — use hyphens (-) or periods instead
- ZERO repetition — if you said it on slide 3, don't rephrase on slide 5
- Every line must contain a SPECIFIC claim, name, number, or concrete detail
- If you can't be specific, CUT the slide — fewer good slides beats more mediocre ones
- Read every headline aloud. If it sounds like a blog header, rewrite it until it sounds like someone grabbing your arm at a party saying "wait, you have to hear this"

═══ CAPTION RULES ═══

The caption is NOT a summary. It EXPANDS on the carousel with details that didn't fit.

Platform: ${platform}
${platformInfo.captionGuidance}

The caption should make someone who skipped the carousel want to go back and read it. And someone who read the carousel want to engage because the caption adds a new dimension.

═══ PLATFORM CONTEXT ═══

Platform: ${platform}
Target slide count: ${platformInfo.slideRange}
Text density: ${platformInfo.textDensity}
Audience: ${platformInfo.audienceNote}
${brandContextSection ? `
═══ BRAND CONTEXT ═══
${brandContextSection}

${BRAND_WRITING_PRINCIPLES}` : ''}
═══ QUALITY GATES ═══

□ Hook slide creates an irresistible reason to swipe (information gap, not information)
□ Every slide EARNS the next swipe — no self-contained, deletable slides
□ Headlines are curiosity triggers, not informational headers
□ All image prompts describe the SAME physical environment from different angles
□ No AI clichés, filler, hedging, or corporate speak anywhere
□ Every claim is specific — numbers, names, dates, percentages
□ The emotional driver is clear and consistent throughout
□ The conclusion recontextualises the hook (re-reading slide 1 after the last slide changes its meaning)
□ The caption EXPANDS, it doesn't summarise
□ The image_hook is a 3-8 word curiosity gap, NOT a topic label
□ Fewer strong slides beats more mediocre ones — cut ruthlessly`;
}

// ─── MAIN GENERATION FUNCTION ─────────────────────────────────────────────

/**
 * Generate carousel content using Claude production engine.
 *
 * @param {object} params
 * @param {string} params.content - Article text or research content
 * @param {string} [params.topic] - Topic string (if no URL source)
 * @param {string} params.platform - Target platform (instagram, linkedin, tiktok, facebook)
 * @param {number} [params.slideCount] - Override slide count
 * @param {string} [params.stylePreset] - Visual style hint for environment selection
 * @param {object} [params.brandContext] - Light brand context (brand_name, blurb, voice, etc.)
 * @param {object} [params.brandProfile] - Full brand profile for deep brand mode
 * @param {object} [params.contentAngle] - Selected content angle
 * @param {string} [params.username] - For cost logging
 * @returns {Promise<object>} { slides, caption_text, visual_world, narrative_strategy, image_hook, brand_violations }
 */
export async function generateCarouselContent({
  content,
  topic = null,
  platform = 'instagram',
  slideCount = null,
  stylePreset = null,
  brandContext = null,
  brandProfile = null,
  contentAngle = null,
  username = null,
}) {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) throw new Error('ANTHROPIC_API_KEY env var required for carousel content generation');

  const client = new Anthropic({ apiKey: anthropicKey });

  // Build brand context section
  let brandContextSection = null;
  if (brandProfile && contentAngle) {
    brandContextSection = buildBrandContextSection(brandProfile, contentAngle, contentAngle.emotional_driver);
  } else if (brandContext) {
    const parts = [
      brandContext.brand_name ? `Brand: ${brandContext.brand_name}` : null,
      brandContext.blurb ? `About: ${brandContext.blurb}` : null,
      brandContext.brand_voice_detail ? `Voice: ${brandContext.brand_voice_detail}` : null,
      brandContext.content_style_rules ? `Style rules: ${brandContext.content_style_rules}` : null,
      brandContext.preferred_elements ? `Include: ${brandContext.preferred_elements}` : null,
      brandContext.prohibited_elements ? `Avoid: ${brandContext.prohibited_elements}` : null,
      brandContext.target_market ? `Audience: ${brandContext.target_market}` : null,
    ].filter(Boolean);
    if (parts.length > 0) {
      brandContextSection = `BRAND CONTEXT (shape tone, depth, and angle to match):\n${parts.join('\n')}\n\nUse the brand's domain expertise to go DEEPER than a generalist would. Reference specifics from the brand's industry. The carousel should feel like it was created by someone who lives in this space.`;
    }
  }

  const systemPrompt = buildCarouselSystemPrompt(platform, stylePreset, brandContextSection);

  // Build user prompt
  const platformInfo = PLATFORM_CONFIG[platform] || PLATFORM_CONFIG.instagram;
  const targetSlides = slideCount || platformInfo.slideRange;

  let userPrompt = `Create a carousel from this source material.

SOURCE CONTENT:
${(content || `Topic: ${topic}`).slice(0, 8000)}
${topic ? `\nUSER'S TOPIC FOCUS: ${topic}` : ''}

REQUIREMENTS:
- Target slide count: ${typeof targetSlides === 'number' ? `exactly ${targetSlides}` : targetSlides} slides
- First slide must be type "hook", last must be type "conclusion"
- All middle slides are type "story"
- Choose the narrative arc and emotional driver that BEST fits this material
- Be ruthlessly specific — every slide needs numbers, names, or concrete details
- Cut any slide that doesn't earn its place

Generate the carousel now. Tell a story worth swiping through.`;

  // Convert Zod schema for Claude tool_use
  const jsonSchema = zodToJsonSchema(CarouselPackageSchema, { target: 'openApi3' });
  const toolInputSchema = jsonSchema.definitions?.CarouselPackageSchema || jsonSchema;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
    tools: [{
      name: 'carousel_content',
      description: 'Output carousel slides with narrative strategy, visual world, caption, and image hook.',
      input_schema: toolInputSchema,
    }],
    tool_choice: { type: 'tool', name: 'carousel_content' },
  });

  const toolUseBlock = response.content.find(b => b.type === 'tool_use');
  if (!toolUseBlock) throw new Error('Claude did not return carousel content');

  const result = toolUseBlock.input;

  // Log cost
  if (response.usage) {
    logCost({
      username: username || 'unknown',
      category: 'anthropic',
      operation: 'carousel_content_generation',
      model: 'claude-sonnet-4-6',
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
    }).catch(() => {});
  }

  // Post-generation validation for brand mode
  let brandViolations = [];
  if (brandProfile) {
    // Check all slide text + caption
    const allText = result.slides.map(s => `${s.headline} ${s.body_text}`).join(' ') + ' ' + result.caption_text;
    const violations = validateBrandContent(allText, brandProfile.brand_name);
    if (violations.length > 0) brandViolations = violations;
  }

  // Strip em dashes from all text (safety net)
  const stripEmDash = (s) => (s || '').replace(/—/g, ' - ').replace(/ {2,}/g, ' ').trim();

  return {
    slides: result.slides.map(s => ({
      ...s,
      headline: stripEmDash(s.headline),
      body_text: stripEmDash(s.body_text),
    })),
    caption_text: stripEmDash(result.caption_text),
    visual_world: result.visual_world,
    narrative_strategy: result.narrative_strategy,
    image_hook: result.image_hook,
    brand_violations: brandViolations,
  };
}

// ─── ARC AND DRIVER LABELS (for frontend display) ─────────────────────────

export const ARC_LABELS = {
  revelation: { label: 'Revelation', color: 'bg-purple-100 text-purple-700' },
  escalation: { label: 'Escalation', color: 'bg-red-100 text-red-700' },
  transformation: { label: 'Transformation', color: 'bg-amber-100 text-amber-700' },
  accumulation: { label: 'Accumulation', color: 'bg-green-100 text-green-700' },
  inversion: { label: 'Inversion', color: 'bg-blue-100 text-blue-700' },
};

export const DRIVER_LABELS = {
  fear: { label: 'Fear', color: 'bg-rose-100 text-rose-700' },
  identity: { label: 'Identity', color: 'bg-indigo-100 text-indigo-700' },
  curiosity: { label: 'Curiosity', color: 'bg-cyan-100 text-cyan-700' },
  injustice: { label: 'Injustice', color: 'bg-orange-100 text-orange-700' },
  wonder: { label: 'Wonder', color: 'bg-violet-100 text-violet-700' },
};
