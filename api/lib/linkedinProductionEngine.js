/**
 * LinkedIn Production Engine
 *
 * Generates engaging LinkedIn posts using the same craft-driven approach
 * as the Shorts Production Engine. Uses Claude Sonnet 4.6 with deep
 * engagement psychology, emotional drivers, and brand integration.
 *
 * Replaces the old 3-style GPT approach (contrarian/story/data) with
 * a psychologically grounded system that produces genuinely engaging posts.
 *
 * Used by: api/linkedin/generate-posts.js
 */

import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { logCost } from './costLogger.js';
import { EMOTIONAL_DRIVERS, buildBrandContextSection, validateBrandContent } from './brandMode.js';
import { BRAND_WRITING_PRINCIPLES } from './brandWritingPrinciples.js';

// ─── ZOD SCHEMA ────────────────────────────────────────────────────────────

const LinkedInPostVariation = z.object({
  hook: z.string().describe('First 1-2 lines (under 200 chars). Must stop the scroll and create an irresistible reason to click "...see more". Contains a contradiction, paradox, or information gap.'),
  body: z.string().describe('Complete post text including the hook as the opening. 150-300 words. No emojis, no hashtags, no markdown, no em dashes. Do NOT include source URLs or CTAs — those are appended automatically.'),
  image_hook: z.string().describe('3-8 word curiosity line for the image overlay. NOT a summary of the post. Creates an information gap that makes someone scrolling their feed NEED to read the post. Examples: "The math doesn\'t work.", "3 words. $4.2 million.", "Nobody talks about this."'),
  image_prompt: z.string().describe('AI image generation prompt. Must visually represent the CORE TENSION of the post. Cinematic editorial quality, 1:1 square, no text in image. 30-50 words. Start with the KEY SUBJECT then add lighting, composition, color grade.'),
  structure_used: z.enum(['paradox', 'evidence_stack', 'story_pivot', 'myth_killer', 'framework', 'quiet_confession']).describe('Which post structure pattern was used'),
  driver_used: z.enum(['fear', 'identity', 'curiosity', 'injustice', 'wonder']).describe('Primary emotional driver'),
});

const LinkedInPackageSchema = z.object({
  posts: z.array(LinkedInPostVariation).min(3).max(3).describe('Three post variations, each using a DIFFERENT structure and a DIFFERENT emotional driver combination.'),
  topic_analysis: z.string().describe('1-2 sentence analysis of what makes this topic engaging and which angles have the most potential.'),
});

// ─── POST STRUCTURES ────────────────────────────────────────────────────────

const POST_STRUCTURES = {
  paradox: {
    name: 'The Paradox',
    description: 'Hook with a contradiction that shouldn\'t be true but is.',
    pattern: `HOOK: Two things that shouldn't both be true, but are. The reader's brain says "wait, what?"
BODY: Explain the mechanism behind the paradox. Each paragraph peels back a layer. The reader should feel smarter with each paragraph.
CLOSE: Reframe — the paradox isn't a bug, it's a feature. Or: the paradox reveals something uncomfortable about the reader's own assumptions.`,
  },
  evidence_stack: {
    name: 'The Evidence Stack',
    description: 'Lead with a surprising claim, stack evidence, close with "so what?"',
    pattern: `HOOK: A claim that feels wrong or surprising. A number nobody would guess.
BODY: Evidence 1 (most surprising) → Evidence 2 (deepens it) → Evidence 3 (makes it personal). Each piece of evidence builds on the last. Never repeat the same point twice.
CLOSE: The "so what" — what this means for the reader's work, career, or decisions. Not a lecture, but a lens they can now see through.`,
  },
  story_pivot: {
    name: 'The Story Pivot',
    description: 'Open with a vivid moment. Build to a turning point. End with a lesson the story earned.',
    pattern: `HOOK: A specific moment — a person, a place, a decision. Not "Once upon a time" but "Tuesday, 3pm, the email arrived."
BODY: Build tension through the story. What went wrong or what was at stake. The moment everything changed. Use concrete details — names, numbers, timestamps.
CLOSE: The lesson — but it lands because the story EARNED it. Not a generic takeaway but something that only makes sense because of THIS story.`,
  },
  myth_killer: {
    name: 'The Myth Killer',
    description: 'Name a belief everyone holds. Show why it\'s wrong. Reveal what\'s actually true.',
    pattern: `HOOK: State the myth as if you believe it — then pull the rug. "Everyone says X. Everyone is wrong."
BODY: Show WHY the myth persists (it's not stupid to believe it — the reader probably believes it). Then show the evidence that breaks it. Each point should make the reader feel upgraded, not judged.
CLOSE: What to believe instead. The replacement insight. The reader should feel like they just leveled up.`,
  },
  framework: {
    name: 'The Framework',
    description: 'Name a pattern nobody has named. Show how it works. Give the reader a new lens.',
    pattern: `HOOK: Name the pattern. Give it language. "There's a thing that happens when X and nobody talks about it."
BODY: Show 2-3 examples where this framework explains what happened. The examples should span different contexts so the framework feels universal and powerful.
CLOSE: Hand the reader the lens. "Next time you see X, look for Y." They now own a tool they didn't have before reading your post.`,
  },
  quiet_confession: {
    name: 'The Quiet Confession',
    description: 'Vulnerable opening about something real. What you learned. What others can take.',
    pattern: `HOOK: Admit something. Not performative vulnerability ("I failed and here's what I learned!") but genuine. "I spent 3 years doing X wrong and didn't know it."
BODY: What the mistake looked like from inside. Why it was hard to see. The moment of clarity — specific, not vague.
CLOSE: What you'd do differently. Not a humble-brag — a genuine handoff of hard-won knowledge. The reader should think "I might be making that same mistake."`,
  },
};

// ─── SYSTEM PROMPT BUILDER ──────────────────────────────────────────────────

function buildLinkedInSystemPrompt(brandContextSection = null) {
  return `You are a LinkedIn post engine. You write posts that stop the scroll, earn the click on "...see more", and leave the reader thinking about what they just read for the rest of the day.

You are NOT a thought leader template machine. You are NOT a corporate communications department. You write like the smartest person at the dinner table who just learned something fascinating and can't help sharing it.

═══ THE FOLD — YOUR #1 CONSTRAINT ═══

LinkedIn truncates posts after approximately 210 characters (~2-3 lines). The reader sees those lines and a "...see more" button.

Those first lines must create an IRRESISTIBLE reason to expand. If the reader doesn't click "...see more", nothing else matters. Not your insight, not your data, not your story. Dead.

WHAT MAKES SOMEONE CLICK "...SEE MORE":
- An information gap: they know SOMETHING is coming but not WHAT
- A contradiction: two things that shouldn't both be true
- A number that doesn't make sense: "They had 10,000 customers and $0 revenue."
- A confession that feels real: "I spent 2 years building the wrong thing."
- Specificity that signals depth: exact numbers, names, dates — not vague claims

WHAT MAKES SOMEONE KEEP SCROLLING (NEVER DO THESE):
- "In today's rapidly evolving landscape..." (dead on arrival)
- Starting with a label: "Hot take:" or "Unpopular opinion:" (lazy, now invisible)
- Starting with a question: "Have you ever wondered...?" (the answer is always "no, bye")
- Generic claims: "AI is changing everything" (the reader already knows, you added nothing)
- Starting with "I'm excited to announce..." (nobody cares about your excitement)

═══ WRITING VOICE ═══

Read every sentence. If it sounds like a blog post, rewrite it until it sounds like something a sharp person would actually SAY to another smart person.

SENTENCE RULES (MANDATORY — violating these produces bad posts):
- Every sentence UNDER 20 words. Shorter is almost always better.
- NO semicolons. Ever. Break into two sentences.
- NO "which" followed by a clause. Break into two sentences.
- NO filler phrases: "In today's world", "Let's dive in", "Here's the thing", "It goes without saying", "At the end of the day", "When it comes to"
- NO hedging: "might", "could potentially", "it's possible that", "I think maybe"
- NO AI clichés: "landscape", "navigate", "leverage", "robust", "delve", "tapestry", "realm", "unleash", "game-changer", "deep dive", "synergy", "paradigm shift", "cutting-edge"
- NO emojis. NO hashtags. NO markdown bold/italic. NO em dashes (—).
- Fragmented sentences are GOOD when they create rhythm: "No insurance. No legal fund. No way out."
- Each sentence should earn the next sentence. If deleting a sentence doesn't hurt, delete it.

SPECIFICITY IS EVERYTHING:
"Revenue grew" = boring. "Revenue hit $4.2M — up from $800K eighteen months earlier" = interesting.
"A company had problems" = boring. "Their checkout page had a 73% abandonment rate" = interesting.
"Many people struggle with this" = boring. "I talked to 40 founders last month. 36 had the same problem." = interesting.
Every time you write a vague claim, replace it with a specific one. Numbers. Names. Dates. Percentages.

PARAGRAPH RHYTHM:
- LinkedIn posts are read on mobile. Keep paragraphs to 1-3 sentences max.
- Use line breaks between paragraphs for breathing room.
- The post should feel like it MOVES — each paragraph pulling the reader forward.
- Vary paragraph length. Short. Then slightly longer to develop a point. Then short for impact.

═══ POST STRUCTURES ═══

Each post must follow one of these engagement-tested structures:

${Object.entries(POST_STRUCTURES).map(([key, s]) => `${s.name.toUpperCase()} (${key}):
${s.description}
${s.pattern}`).join('\n\n')}

═══ EMOTIONAL DRIVERS ═══

Every engaging post triggers one primary emotional driver. Choose deliberately based on the source material.

FEAR / LOSS AVERSION (fear):
The reader discovers a risk they didn't know existed. Tension builds through specificity.
Use for: cautionary tales, hidden costs, regulatory risks, market shifts, things people are doing wrong.
Pacing: sentences DECELERATE toward the close. Each word carries more weight. The close should be quiet and personal — not shouting.
Failure modes: Fear without specificity means nothing. Fear without a path forward creates helplessness, not engagement.

IDENTITY / ASPIRATION (identity):
The reader categorizes themselves — "am I the amateur or the professional?"
Use for: best practices vs common mistakes, skill gaps, career decisions, professional development.
Pacing: PIVOT in the middle. First half establishes the dichotomy. Second half forces a choice.
Failure modes: Being condescending about the "wrong" approach. Making the "right" approach feel unachievable.

CURIOSITY / EDUCATION (curiosity):
The reader encounters an information gap that MUST be filled.
Use for: counterintuitive findings, how-things-actually-work, hidden mechanisms, surprising data.
Pacing: ACCELERATE through the middle. Each revelation comes faster, widening the gap until the payoff.
Failure modes: Starting with the obvious instead of the surprising. Being so educational it feels like a lecture.

INJUSTICE / MORAL OUTRAGE (injustice):
Something unfair is exposed. The reader wants others to know.
Use for: industry problems, systemic issues, unfair practices, transparency gaps.
Pacing: ACCUMULATE evidence. Fact on fact on fact until the unfairness is undeniable. Always punch UP at systems, never down at individuals.
Failure modes: Manufacturing outrage without evidence. Leaving the reader angry but helpless.

WONDER / AWE (wonder):
Something remarkable is revealed. The reader marvels.
Use for: innovations, surprising achievements, elegant solutions, human ingenuity.
Pacing: BREATHE. Let the remarkable details land. Don't rush past the beautiful parts.
Failure modes: Overusing superlatives ("the most amazing thing ever"). Not connecting the wonder back to the reader's world.

═══ IMAGE HOOK — THE CURIOSITY TRIGGER ═══

The image_hook is NOT a summary. It is NOT a quote from the post. It is a 3-8 word CURIOSITY GAP that makes someone scrolling their feed NEED to read the post.

GOOD image hooks create an information gap:
- "The math doesn't work." (what math? I need to know)
- "3 words. $4.2 million." (what 3 words? tell me)
- "Nobody talks about this." (about what??)
- "What happens at 3am." (what happens?!)
- "The mistake 90% make." (am I in the 90%?)
- "Two emails changed everything." (which emails?)
- "They deleted the evidence." (who? what evidence?)

BAD image hooks summarize or bore:
- "AI is transforming business" (I already know this)
- "Key takeaways from the report" (summary energy, not curiosity energy)
- "How to improve your workflow" (generic, could be any post)
- The entire first sentence of the post (that's a spoiler, not a hook)
- Any complete thought (if the image tells them everything, why read the post?)

The image hook should make the reader's brain say "WHAT?" or "HOW?" or "WAIT—"

Use sentence case (capitalize only the first word and proper nouns). End with a period for impact.

═══ IMAGE PROMPT RULES ═══

The AI-generated image must visually represent the CORE TENSION of the post, not just the topic.

If the post is about a $4.2M mistake, the image should evoke consequence — not "person at desk."
If the post is about a hidden pattern, hint at something beneath the surface.
If it's a story, capture the PIVOTAL MOMENT — the turning point, not the setup.

Rules:
- 1:1 square aspect ratio (the prompt should compose for square)
- NO text rendered in the image — text overlay is handled by the compositor
- Cinematic, editorial quality — lighting, depth of field, color grade
- Must work at thumbnail size (simple composition, clear focal point)
- 30-50 words
- Start with the KEY SUBJECT, then add cinematic direction after
- Avoid identifiable human faces — use hands, silhouettes, over-shoulder, close-ups of objects
- Bold color and contrast — this needs to stand out in a LinkedIn feed

═══ CLOSING RULES ═══

The last line of the post is the most important line after the hook.

GOOD closings:
- A reframe that changes how the hook reads if you re-read it
- A question the reader will actually chew on (not rhetorical fluff)
- A binary choice: "You're either X or Y. The difference is one conversation."
- A quiet kicker: the most quotable line in the post, said with restraint
- A callback to the opening that now means something different

BAD closings:
- "What do you think? Let me know in the comments!" (begging for engagement)
- "Follow for more insights like this." (nobody follows because you asked)
- "Like and repost if you agree." (desperation)
- "Tag someone who needs to hear this." (chain email energy)
- Any sentence starting with "Remember:" (condescending)
- "Agree or disagree?" (lazy engagement bait)
- "If you found this valuable..." (presumptuous)

The close should make the reader WANT to comment because they have something to say — not because you asked them to.

═══ SOURCE ATTRIBUTION ═══

Do NOT include source URLs, "src:" lines, or any attribution in the post body. These will be appended automatically after generation. Do NOT include CTAs, "follow for more", "link in bio", or promotional language.
${brandContextSection ? `
═══ BRAND CONTEXT ═══
${brandContextSection}

${BRAND_WRITING_PRINCIPLES}` : ''}
═══ QUALITY GATES (every post must pass ALL of these) ═══

□ First 200 characters create an irresistible reason to click "...see more"
□ No sentence over 20 words
□ No AI clichés, filler, hedging, or corporate speak anywhere in the post
□ Every claim is specific — numbers, names, dates, percentages (not vague assertions)
□ The emotional driver is clear and consistent throughout the post
□ The closing is quotable and does NOT beg for engagement
□ The image_hook creates a curiosity gap in 3-8 words — NOT a summary
□ The post provides genuine value — a reader who never engages would still benefit
□ Deleting any paragraph would hurt the post (no filler, no padding)
□ Read aloud, it sounds like sharp SPEECH, not a blog post or press release
□ The three posts use three DIFFERENT structures and three DIFFERENT emotional drivers`;
}

// ─── MAIN GENERATION FUNCTION ───────────────────────────────────────────────

/**
 * Generate 3 engaging LinkedIn post variations from source material.
 *
 * @param {object} params
 * @param {object} params.topic - Topic object from DB (source_title, source_url, source_summary)
 * @param {string} params.content - Full article text
 * @param {object} [params.brandContext] - Light brand context { brand_name, industry, target_audience, tagline }
 * @param {object} [params.brandProfile] - Full brand profile for deep brand mode
 * @param {object} [params.contentAngle] - Selected content angle (with emotional_driver)
 * @param {string} [params.postFormat] - Optional format template key for structural guidance
 * @param {string} [params.username] - For cost logging
 * @returns {Promise<object>} { posts: [...], topic_analysis, brand_violations }
 */
export async function generateLinkedInPosts({
  topic,
  content,
  brandContext = null,
  brandProfile = null,
  contentAngle = null,
  postFormat = null,
  username = null,
}) {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) throw new Error('ANTHROPIC_API_KEY env var required for LinkedIn post generation');

  const client = new Anthropic({ apiKey: anthropicKey });

  // Build brand context section for system prompt
  let brandContextSection = null;
  if (brandProfile && contentAngle) {
    // Deep brand mode (full brand profile + content angle)
    brandContextSection = buildBrandContextSection(brandProfile, contentAngle, contentAngle.emotional_driver);
  } else if (brandContext) {
    // Light brand context from brand kit
    const parts = [
      brandContext.brand_name ? `Brand: ${brandContext.brand_name}` : null,
      brandContext.industry ? `Industry: ${brandContext.industry} — shape your expertise depth and terminology to match` : null,
      brandContext.target_audience ? `Target audience: ${brandContext.target_audience} — write for THIS person specifically` : null,
      brandContext.tagline ? `Brand positioning: ${brandContext.tagline}` : null,
    ].filter(Boolean);
    if (parts.length > 0) {
      brandContextSection = `BRAND CONTEXT (shape tone, depth, and expertise to match this brand's positioning):\n${parts.join('\n')}\n\nUse the brand's industry expertise to go DEEPER than a generalist would. Reference specifics from the brand's domain. The post should feel like it was written by someone who lives in this industry, not someone who Googled it.`;
    }
  }

  const systemPrompt = buildLinkedInSystemPrompt(brandContextSection);

  // Build user prompt
  let userPrompt = `Generate 3 LinkedIn post variations from this source material.

SOURCE: ${topic.source_title}
URL: ${topic.source_url}

ARTICLE CONTENT:
${(content || topic.source_summary || '(no content available)').slice(0, 6000)}

REQUIREMENTS:
- Generate exactly 3 posts, each using a DIFFERENT structure and a DIFFERENT emotional driver
- Each post should feel like it was written by a completely different (but equally sharp) person
- Each post: 150-300 words, plain text, no formatting
- Each image_hook: 3-8 words that create a curiosity gap, NOT a summary
- Each image_prompt: cinematic editorial image that matches the post's core tension
- Do NOT include source URLs, "src:" attribution, or any CTAs in the post body — these are appended automatically after generation
- No emojis, no hashtags, no markdown, no em dashes`;

  if (postFormat) {
    userPrompt += `\n\nSTRUCTURAL GUIDANCE: The user has requested the "${postFormat}" format. Incorporate this structural approach into at least one of the 3 posts if it fits the source material. The other posts should still use different structures.`;
  }

  userPrompt += `\n\nGenerate the 3 posts now. Make each one genuinely different — different angle, different hook, different emotional register.`;

  // Convert Zod schema for Claude tool_use
  const jsonSchema = zodToJsonSchema(LinkedInPackageSchema, { target: 'openApi3' });
  const toolInputSchema = jsonSchema.definitions?.LinkedInPackageSchema || jsonSchema;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 6144,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
    tools: [{
      name: 'linkedin_posts',
      description: 'Output 3 LinkedIn post variations with image hooks and image prompts.',
      input_schema: toolInputSchema,
    }],
    tool_choice: { type: 'tool', name: 'linkedin_posts' },
  });

  const toolUseBlock = response.content.find(b => b.type === 'tool_use');
  if (!toolUseBlock) throw new Error('Claude did not return LinkedIn posts');

  const result = toolUseBlock.input;

  // Log cost
  if (response.usage) {
    logCost({
      username: username || 'unknown',
      category: 'anthropic',
      operation: 'linkedin_post_generation',
      model: 'claude-sonnet-4-6',
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
    }).catch(() => {});
  }

  // Post-generation validation for brand mode
  let brandViolations = [];
  if (brandProfile) {
    for (const post of result.posts) {
      const violations = validateBrandContent(post.body, brandProfile.brand_name);
      if (violations.length > 0) {
        brandViolations.push(...violations.map(v => ({ ...v, post_structure: post.structure_used })));
      }
    }
  }

  return {
    ...result,
    brand_violations: brandViolations,
  };
}

// ─── STRUCTURE AND DRIVER LABELS (for frontend display) ─────────────────────

export const STRUCTURE_LABELS = {
  paradox: { label: 'Paradox', color: 'bg-purple-100 text-purple-700' },
  evidence_stack: { label: 'Evidence', color: 'bg-green-100 text-green-700' },
  story_pivot: { label: 'Story', color: 'bg-amber-100 text-amber-700' },
  myth_killer: { label: 'Myth Killer', color: 'bg-red-100 text-red-700' },
  framework: { label: 'Framework', color: 'bg-blue-100 text-blue-700' },
  quiet_confession: { label: 'Confession', color: 'bg-slate-100 text-slate-700' },
};

export const DRIVER_LABELS = {
  fear: { label: 'Fear', icon: 'AlertTriangle' },
  identity: { label: 'Identity', icon: 'User' },
  curiosity: { label: 'Curiosity', icon: 'Search' },
  injustice: { label: 'Injustice', icon: 'Scale' },
  wonder: { label: 'Wonder', icon: 'Sparkles' },
};
