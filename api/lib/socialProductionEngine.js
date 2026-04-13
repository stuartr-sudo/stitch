/**
 * Social Production Engine
 *
 * Platform-aware post generation engine supporting Instagram, Facebook,
 * and LinkedIn. Uses Claude Sonnet 4.6 with engagement psychology,
 * emotional drivers, and brand integration.
 *
 * Extends the same craft-driven approach as the LinkedIn and Carousel
 * production engines, with platform-specific writing rules, caption
 * conventions, and image prompt strategies.
 *
 * Used by: api/social/generate-posts.js
 */

import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { logCost } from './costLogger.js';
import { buildBrandContextSection, validateBrandContent } from './brandMode.js';
import { BRAND_WRITING_PRINCIPLES } from './brandWritingPrinciples.js';

// ─── ZOD SCHEMA ────────────────────────────────────────────────────────────

const SocialPostVariation = z.object({
  hook: z.string().describe('Opening 1-2 lines that stop the scroll. Under 150 chars. Creates curiosity, contradiction, or emotional tension.'),
  body: z.string().describe('Complete post text including the hook as opening. Platform-appropriate length. No em dashes.'),
  image_hook: z.string().describe('3-8 word curiosity line for image overlay. NOT a summary. Creates an information gap. Makes viewer think "WHAT?" or "HOW?"'),
  image_prompt: z.string().describe('AI image generation prompt. Cinematic editorial quality, 4:5 portrait orientation. No text in image. 30-50 words. Key subject + lighting + composition + color grade.'),
  structure_used: z.enum(['paradox', 'evidence_stack', 'story_pivot', 'myth_killer', 'framework', 'quiet_confession']).describe('Post structure pattern used'),
  driver_used: z.enum(['fear', 'identity', 'curiosity', 'injustice', 'wonder']).describe('Primary emotional driver'),
});

const SocialPackageSchema = z.object({
  posts: z.array(SocialPostVariation).min(3).max(3).describe('Three post variations, each using a DIFFERENT structure and emotional driver.'),
  topic_analysis: z.string().describe('1-2 sentence analysis of what makes this topic engaging for this platform.'),
});

// ─── POST STRUCTURES ────────────────────────────────────────────────────────

const POST_STRUCTURES = {
  paradox: {
    name: 'The Paradox',
    pattern: `HOOK: Two things that shouldn't both be true, but are. The reader's brain says "wait, what?"
BODY: Explain the mechanism. Each paragraph peels back a layer. Reader feels smarter with each paragraph.
CLOSE: Reframe — the paradox reveals something about the reader's own assumptions.`,
  },
  evidence_stack: {
    name: 'The Evidence Stack',
    pattern: `HOOK: A claim that feels wrong. A number nobody would guess.
BODY: Stack 3-5 independent pieces of evidence. Different angles — data, anecdote, comparison, expert quote.
CLOSE: "So what?" — make it personal to the reader.`,
  },
  story_pivot: {
    name: 'The Story Pivot',
    pattern: `HOOK: Drop into a specific scene — a person, place, or moment.
BODY: The story seems to be about one thing... then pivots to reveal it's about something bigger.
CLOSE: The personal becomes universal. The reader sees themselves in the story.`,
  },
  myth_killer: {
    name: 'The Myth Killer',
    pattern: `HOOK: Name a belief everyone holds. State it confidently.
BODY: Then dismantle it. Show WHY it's wrong with specific evidence.
CLOSE: Replace the old belief with something more nuanced. Don't leave wreckage — build something better.`,
  },
  framework: {
    name: 'The Framework',
    pattern: `HOOK: Name a problem everyone recognizes.
BODY: Offer a clear mental model (2-3 principles, a spectrum, a decision tree). Make it visual — the reader should be able to hold it in their head.
CLOSE: Show how the framework changes one specific decision.`,
  },
  quiet_confession: {
    name: 'The Quiet Confession',
    pattern: `HOOK: Admit something uncomfortable. Raw honesty.
BODY: Go deeper — what did this cost? What did you learn? Be specific, not generic "failure is good."
CLOSE: The lesson, but earned. Not a platitude — a hard truth the reader hasn't heard before.`,
  },
};

// ─── PLATFORM CONFIG ────────────────────────────────────────────────────────

const PLATFORM_CONFIG = {
  instagram: {
    name: 'Instagram',
    imageRatio: '4:5 portrait (1080×1350)',
    captionRules: `INSTAGRAM CAPTION RULES:
- 100-300 words. Punchy, visual-first writing.
- Opening line must hook within 125 characters (the fold on mobile).
- Paragraph breaks for readability (short paragraphs, 2-3 sentences max).
- End with a conversation starter — a question, a "tag someone", or a "save this."
- 8-15 relevant hashtags AFTER the main text, separated by a line break.
- Emojis allowed SPARINGLY in the caption (max 3-5 total, strategic placement only).
- NO emojis in the first line (it cheapens the hook).
- Tone: confident, slightly informal, like a smart friend sharing something fascinating.`,
    audienceNote: 'Visual-first audience on mobile. The IMAGE stops the scroll, the CAPTION keeps them reading. Write for the double-tap and the save.',
    writingVoice: 'Conversational but sharp. Every sentence earns the next. Think "smart friend at coffee" not "brand account."',
  },
  facebook: {
    name: 'Facebook',
    imageRatio: '4:5 portrait (1080×1350)',
    captionRules: `FACEBOOK CAPTION RULES:
- 100-250 words. Conversational, shareable writing.
- Opening line must hook within 100 characters (Facebook truncates early).
- Write for shares — the reader should think "my friend needs to see this."
- End with a question that sparks genuine discussion (not "What do you think?").
- 0-3 hashtags maximum (Facebook penalizes hashtag spam).
- NO emojis in the text body. Facebook audience skews older and reads emojis as unserious.
- Tone: warm, accessible, like explaining something interesting to a smart colleague.`,
    audienceNote: 'Broad audience. Shareability is the key metric. Write something people want to share to look smart or start a conversation.',
    writingVoice: 'Warm and accessible. Slightly more formal than Instagram. Write for the share button.',
  },
  linkedin: {
    name: 'LinkedIn',
    imageRatio: '4:5 portrait (1080×1350)',
    captionRules: `LINKEDIN CAPTION RULES:
- 150-300 words. Professional but human.
- First line under 200 characters — this is all they see before "...see more."
- No emojis, no hashtags, no markdown formatting.
- End with a thought-provoking question or a reframe that changes how the reader sees their work.
- Tone: sharp industry insider, not corporate fluff. Write like the smartest person in the room who's also the most approachable.`,
    audienceNote: 'Professional audience seeking career-relevant insights. They want to feel smarter and share content that makes them look smart.',
    writingVoice: 'Sharp, expert, approachable. Think "keynote speaker at a bar after the conference."',
  },
};

// ─── SYSTEM PROMPT BUILDER ────────────────────────────────────────────────

function buildSocialSystemPrompt(platform, brandContextSection) {
  const platformInfo = PLATFORM_CONFIG[platform] || PLATFORM_CONFIG.instagram;

  return `You are a social media content engine for ${platformInfo.name}. You create posts that stop the scroll, earn the read, and drive engagement.

You are NOT a content template machine. You create CONTENT that feels like it was written by a brilliant human who happens to be an expert on this topic.

═══ THE SCROLL STOP — YOUR #1 CONSTRAINT ═══

On ${platformInfo.name}, you have less than 1 second to earn someone's attention. The image + opening line must create enough tension that NOT reading feels like walking away from a secret.

WHAT STOPS THE SCROLL:
- A contradiction that shouldn't be true
- A number that rewrites what you thought you knew
- A confession that feels too honest for social media
- A claim so specific it demands explanation
- An image that creates a visual information gap

WHAT GETS SCROLLED PAST:
- Generic advice ("Be consistent!", "Focus on value!")
- Obvious statements dressed up as insights
- Corporate tone, buzzwords, or AI clichés
- Hooks that promise but don't deliver in the body

═══ POST STRUCTURES ═══

Choose the structure that best fits the source material:

${Object.entries(POST_STRUCTURES).map(([key, s]) => `${s.name.toUpperCase()} (${key}):
${s.pattern}`).join('\n\n')}

═══ EMOTIONAL DRIVERS ═══

Every engaging post triggers one primary emotional driver:

FEAR / LOSS AVERSION: The reader discovers a risk they didn't know existed.
IDENTITY / ASPIRATION: The reader categorizes themselves. "Am I the 73% or the 27%?"
CURIOSITY / EDUCATION: An information gap that MUST be filled.
INJUSTICE / MORAL OUTRAGE: Something unfair exposed. Punch UP, never down.
WONDER / AWE: Something remarkable that makes the reader pause and think.

═══ PLATFORM: ${platformInfo.name.toUpperCase()} ═══

Image format: ${platformInfo.imageRatio}
Audience: ${platformInfo.audienceNote}
Writing voice: ${platformInfo.writingVoice}

${platformInfo.captionRules}

═══ IMAGE HOOKS ═══

The image_hook appears as text overlay on the post image. It is NOT a summary. It is a 3-8 word CURIOSITY GAP.

GOOD: "The math doesn't work.", "Nobody talks about this.", "3 words. $4.2 million."
BAD: "5 Tips for Better Marketing", "Key AI Trends for 2026", "How to Improve Your Workflow"

═══ IMAGE PROMPTS ═══

Generate prompts for 4:5 PORTRAIT images. Cinematic editorial quality.
- Start with the KEY SUBJECT that represents the post's core tension
- Add lighting direction (golden hour, harsh fluorescent, moody backlight)
- Add composition (close-up, medium shot, overhead, shallow depth of field)
- Add color grade (warm, cool, desaturated, high contrast)
- NEVER include text, logos, or UI elements in the image
- NEVER use abstract concepts — only physical, photographable subjects
- 30-50 words per prompt

═══ WRITING RULES ═══

MANDATORY:
- ZERO filler: "In today's world", "Let's dive in", "Here's the thing", "Did you know"
- ZERO hedging: "might", "could potentially", "it's possible that"
- ZERO AI clichés: "landscape", "navigate", "leverage", "robust", "delve", "tapestry", "game-changer", "revolutionize", "unlock", "supercharge", "empower", "elevate", "seamless", "cutting-edge"
- ZERO em dashes (—) — use hyphens (-) or periods instead
- ZERO repetition — if you said it in sentence 3, don't rephrase in sentence 7
- Every line must contain a SPECIFIC claim, name, number, or concrete detail
- Read every hook aloud. If it sounds like a blog headline, rewrite it until it sounds like someone grabbing your arm saying "wait, you have to hear this"
${brandContextSection ? `
═══ BRAND CONTEXT ═══
${brandContextSection}

${BRAND_WRITING_PRINCIPLES}` : ''}
═══ QUALITY GATES ═══

Before outputting, verify:
□ Hook creates an irresistible reason to keep reading (information gap, not information)
□ Body delivers on the hook's promise with specific evidence
□ Every sentence earns the next — no filler, no repetition
□ The emotional driver is clear and consistent
□ Image hook is a curiosity gap, NOT a topic label
□ Image prompt describes a photographable scene, not an abstract concept
□ No AI clichés, filler, hedging, or corporate speak anywhere
□ Platform conventions are followed (hashtags, length, tone)`;
}

// ─── MAIN GENERATION FUNCTION ─────────────────────────────────────────────

/**
 * Generate social posts using Claude production engine.
 *
 * @param {object} params
 * @param {object} params.topic - Topic object with source_title, source_url, source_summary
 * @param {string} params.content - Full article content
 * @param {string} params.platform - Target platform (instagram, facebook, linkedin)
 * @param {object} [params.brandContext] - Light brand context
 * @param {object} [params.brandProfile] - Full brand profile for deep mode
 * @param {object} [params.contentAngle] - Selected content angle
 * @param {string} [params.username] - For cost logging
 * @returns {Promise<object>} { posts, topic_analysis, brand_violations }
 */
export async function generateSocialPosts({
  topic,
  content,
  platform = 'instagram',
  brandContext = null,
  brandProfile = null,
  contentAngle = null,
  username = null,
}) {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) throw new Error('ANTHROPIC_API_KEY env var required for social post generation');

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
      brandContext.industry ? `Industry: ${brandContext.industry}` : null,
      brandContext.target_market ? `Audience: ${brandContext.target_market}` : null,
      brandContext.content_style_rules ? `Style rules: ${brandContext.content_style_rules}` : null,
      brandContext.preferred_elements ? `Include: ${brandContext.preferred_elements}` : null,
      brandContext.prohibited_elements ? `Avoid: ${brandContext.prohibited_elements}` : null,
    ].filter(Boolean);
    if (parts.length > 0) {
      brandContextSection = parts.join('\n');
    }
  }

  const systemPrompt = buildSocialSystemPrompt(platform, brandContextSection);

  const platformInfo = PLATFORM_CONFIG[platform] || PLATFORM_CONFIG.instagram;

  let userPrompt = `Generate 3 ${platformInfo.name} post variations from this source material.

SOURCE: ${topic.source_title || 'Custom topic'}
${topic.source_url ? `URL: ${topic.source_url}` : ''}

CONTENT:
${(content || topic.source_summary || topic.source_title || '(no content available)').slice(0, 6000)}

REQUIREMENTS:
- Generate exactly 3 posts, each using a DIFFERENT structure and a DIFFERENT emotional driver
- Each post should feel like it was written by a completely different (but equally sharp) person
- Each image_hook: 3-8 words that create a curiosity gap
- Each image_prompt: cinematic editorial 4:5 portrait image matching the post's core tension
- Do NOT include source URLs or CTAs in the post body — those are appended automatically
- Follow all ${platformInfo.name} caption rules exactly

Generate the 3 posts now. Make each one genuinely different.`;

  // Convert Zod schema for Claude tool_use
  const jsonSchema = zodToJsonSchema(SocialPackageSchema, { target: 'openApi3' });
  const toolInputSchema = jsonSchema.definitions?.SocialPackageSchema || jsonSchema;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 6000,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
    tools: [{
      name: 'social_posts',
      description: 'Output 3 social post variations with hooks, bodies, image hooks, and image prompts.',
      input_schema: toolInputSchema,
    }],
    tool_choice: { type: 'tool', name: 'social_posts' },
  });

  const toolUseBlock = response.content.find(b => b.type === 'tool_use');
  if (!toolUseBlock) throw new Error('Claude did not return social post content');

  const result = toolUseBlock.input;

  // Log cost
  if (response.usage) {
    logCost({
      username: username || 'unknown',
      category: 'anthropic',
      operation: `social_${platform}_generation`,
      model: 'claude-sonnet-4-6',
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
    }).catch(() => {});
  }

  // Post-generation brand validation
  let brandViolations = [];
  if (brandProfile) {
    const allText = result.posts.map(p => `${p.hook} ${p.body}`).join(' ');
    const violations = validateBrandContent(allText, brandProfile.brand_name);
    if (violations.length > 0) brandViolations = violations;
  }

  return {
    posts: result.posts,
    topic_analysis: result.topic_analysis,
    brand_violations: brandViolations,
  };
}

// ─── EXPORTS FOR FRONTEND DISPLAY ────────────────────────────────────────

export const STRUCTURE_LABELS = {
  paradox: { label: 'Paradox', cls: 'bg-purple-100 text-purple-700' },
  evidence_stack: { label: 'Evidence Stack', cls: 'bg-emerald-100 text-emerald-700' },
  story_pivot: { label: 'Story Pivot', cls: 'bg-blue-100 text-blue-700' },
  myth_killer: { label: 'Myth Killer', cls: 'bg-red-100 text-red-700' },
  framework: { label: 'Framework', cls: 'bg-amber-100 text-amber-700' },
  quiet_confession: { label: 'Confession', cls: 'bg-pink-100 text-pink-700' },
};

export const DRIVER_LABELS = {
  fear: { label: 'Fear', cls: 'bg-rose-100 text-rose-700' },
  identity: { label: 'Identity', cls: 'bg-indigo-100 text-indigo-700' },
  curiosity: { label: 'Curiosity', cls: 'bg-cyan-100 text-cyan-700' },
  injustice: { label: 'Injustice', cls: 'bg-orange-100 text-orange-700' },
  wonder: { label: 'Wonder', cls: 'bg-violet-100 text-violet-700' },
};

export { PLATFORM_CONFIG };
