/**
 * Narrative Generator V2 — Hook-first, two-pass script generation.
 *
 * ARCHITECTURE:
 *  Pass 1: Generate hook independently (dedicated call, highest quality)
 *  Pass 2: Generate full narrative with locked hook
 *  Pass 3: Revision pass — tighten, kill clichés, fix word count, check continuity
 *
 * Produces words-only output: narration with hook, per-scene text segments.
 * NO visual or motion prompts — those come from sceneDirector.js (Stage 2).
 */

import OpenAI from 'openai';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import { logCost } from './costLogger.js';

// ── Zod schemas ─────────────────────────────────────────────────────────────

const HookSchema = z.object({
  hook: z.string().describe('The opening hook sentence — must create a specific, concrete information gap'),
  hook_type: z.enum(['stat', 'story', 'question', 'contradiction', 'confession', 'cliffhanger']).describe('What type of hook this is'),
  payoff_promise: z.string().describe('What the viewer expects to learn by the end — the hook must set this up'),
});

const NarrativeSceneSchema = z.object({
  scene_label: z.string().describe('Framework beat name'),
  narration_segment: z.string().describe('Voiceover text for this scene'),
  word_count: z.number().describe('Actual word count of narration_segment'),
  duration_seconds: z.number().describe('Target scene duration in seconds'),
  overlay_text: z.string().nullable().describe('On-screen text overlay (null if none)'),
  emotional_beat: z.string().describe('The emotional shift in this scene: e.g., "curiosity → shock", "tension → relief"'),
});

const NarrativeDraftSchema = z.object({
  title: z.string().max(100),
  description: z.string().max(500),
  hashtags: z.array(z.string()).max(15),
  hook_line: z.string().describe('The opening hook — first sentence'),
  narration_full: z.string().describe('Complete voiceover — all scenes as one continuous monologue'),
  scenes: z.array(NarrativeSceneSchema),
  music_mood: z.string(),
});

const RevisionSchema = z.object({
  narration_full: z.string().describe('The revised, tightened narration'),
  scenes: z.array(z.object({
    scene_label: z.string(),
    narration_segment: z.string(),
  })),
  changes_made: z.array(z.string()).describe('List of specific changes made during revision'),
});

// ── Cliché blocklist ────────────────────────────────────────────────────────

const CLICHE_PATTERNS = [
  /buckle up/i, /let's dive in/i, /here's the thing/i, /what if i told you/i,
  /game.?changer/i, /mind.?blowing/i, /\binsane\b/i, /\bliterally\b/i, /\babsolutely\b/i,
  /at the end of the day/i, /in today's world/i, /it turns out/i, /the truth is/i,
  /picture this/i, /imagine this/i, /fast forward to/i, /but here's the kicker/i,
  /spoiler alert/i, /the rest is history/i, /needless to say/i, /long story short/i,
  /without further ado/i, /brace yourself/i, /you won't believe/i, /jaw.?drop/i,
  /think again/i, /not what you think/i, /plot twist/i, /here's where it gets/i,
  /but wait,? there's more/i, /stay tuned/i, /strap in/i, /hold onto your/i,
  /let that sink in/i, /read that again/i, /i'll say it louder/i,
  /living rent.?free/i, /hits different/i, /no cap/i, /lowkey/i, /highkey/i,
  /it's giving/i, /main character/i, /\btoxic\b/i, /\bunpack\b/i, /deep dive/i,
  /level up/i, /hack your/i, /pro tip/i, /life hack/i,
  /—/, /–/, // em-dash and en-dash
];

function flagCliches(text) {
  return CLICHE_PATTERNS
    .filter(p => p.test(text))
    .map(p => text.match(p)?.[0])
    .filter(Boolean);
}

// ── Gold-standard hook examples by pattern ──────────────────────────────────

const HOOK_EXAMPLES = {
  'story-open': {
    good: [
      'In 2019, a janitor at MIT solved a math problem that had stumped professors for 30 years.',
      'My neighbor disappeared for three days. When she came back, she spoke a language nobody recognized.',
      'A surgeon in 1847 had a 300% mortality rate on a single operation. Three people died and only one was the patient.',
    ],
    bad: [
      'Let me tell you an amazing story about something incredible that happened.',
      'You won\'t believe what happened next in this mind-blowing tale.',
      'Picture this: something unbelievable is about to unfold.',
    ],
  },
  'question': {
    good: [
      'Why do hospital scrubs come in that exact shade of green?',
      'What happens to your body at 20,000 feet without a pressurized cabin?',
      'There are more trees on Earth than stars in the Milky Way. How is that possible?',
    ],
    bad: [
      'Have you ever wondered about something really interesting?',
      'What if I told you something that would blow your mind?',
      'Ready for a question that will change everything?',
    ],
  },
  'mystery-reveal': {
    good: [
      'There is a room in the Vatican that has been locked since 1962. Last year, someone finally opened it.',
      'Every 27 seconds, a signal pulses from an empty patch of sky. It has done this for 38 years.',
      'The FDA approved a drug in 1996 that they knew didn\'t work. The story of why is worse than you think.',
    ],
    bad: [
      'Behind this door lies a secret that will shock you.',
      'What I\'m about to reveal will change how you see everything.',
      'The hidden truth is more disturbing than anyone imagined.',
    ],
  },
  'contrarian': {
    good: [
      'Stretching before exercise makes you weaker. The study that proved it has been ignored for 20 years.',
      'The country with the longest life expectancy eats more salt than anywhere else on Earth.',
      'Einstein failed math is a myth. His actual worst subject tells a much more interesting story.',
    ],
    bad: [
      'Everything you know about this topic is completely wrong.',
      'The experts have been lying to you this whole time.',
      'Unpopular opinion: the thing everyone believes is actually false.',
    ],
  },
  'list-countdown': {
    good: [
      'Number three on this list killed 12,000 people before anyone noticed the pattern.',
      'I ranked every method and the winner costs $0 and takes 4 minutes.',
      'The last item on this list was classified by three separate governments.',
    ],
    bad: [
      'Number one will absolutely blow your mind.',
      'You won\'t believe what\'s at the top of this list.',
      'These items are ranked from least to most mind-blowing.',
    ],
  },
};

// ── PASS 1: Hook Generation ─────────────────────────────────────────────────

async function generateHook({ niche, topic, nicheTemplate, framework, storyContext, keys }) {
  const openai = new OpenAI({ apiKey: keys.openaiKey });

  const hookPattern = framework?.narrative?.hookPattern || 'story-open';
  const examples = HOOK_EXAMPLES[hookPattern] || HOOK_EXAMPLES['story-open'];

  const systemPrompt = `You are a hook specialist for short-form video. Your ONLY job is to write the opening sentence.

THE HOOK RULES:
- One sentence. Maximum 25 words. Usually 12-18 words.
- Must create a SPECIFIC information gap. The viewer must NEED to know what happens next.
- Must contain at least one concrete detail: a number, a name, a place, a date, or a specific noun.
- Must NOT contain any of these banned words/phrases: mind-blowing, insane, incredible, unbelievable, shocking, game-changer, you won't believe, what if I told you, buckle up, picture this, imagine this.
- Must NOT use emdashes or endashes.
- Must NOT be a question unless the hook pattern specifically calls for it.

HOOK PATTERN: ${hookPattern}
${framework?.narrative?.hookExamples?.length ? `\nFRAMEWORK HOOK INSPIRATION (don't copy, use the structure):\n${framework.narrative.hookExamples.map(h => `  - "${h}"`).join('\n')}` : ''}

GOOD HOOKS (study these — notice the specificity):
${examples.good.map(h => `  ✓ "${h}"`).join('\n')}

BAD HOOKS (never write anything like these — notice the vagueness):
${examples.bad.map(h => `  ✗ "${h}"`).join('\n')}

The hook must set up a PAYOFF PROMISE — something the viewer will learn or discover by watching to the end.`;

  const userPrompt = topic
    ? `Write a hook for a ${nicheTemplate?.name || niche} video about: ${topic}${storyContext ? `\n\nContext: ${storyContext}` : ''}`
    : `Write a hook for a ${nicheTemplate?.name || niche} video about a trending topic. Pick something specific.`;

  const completion = await openai.chat.completions.parse({
    model: 'gpt-4.1-mini-2025-04-14',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: zodResponseFormat(HookSchema, 'hook_generation'),
    temperature: 1.0,
  });

  const result = completion.choices[0].message.parsed;

  const hookWords = result.hook.split(/\s+/).length;
  const cliches = flagCliches(result.hook);
  if (cliches.length > 0) {
    console.warn(`[narrativeGenerator] Hook contains clichés: ${cliches.join(', ')}`);
  }
  if (hookWords > 30) {
    console.warn(`[narrativeGenerator] Hook too long (${hookWords} words) — truncating`);
    result.hook = result.hook.split(/\s+/).slice(0, 25).join(' ');
  }

  console.log(`[narrativeGenerator] Hook: "${result.hook}" (${hookWords} words, type=${result.hook_type})`);
  return { ...result, usage: completion.usage };
}

// ── PASS 2: Full Narrative ──────────────────────────────────────────────────

async function generateFullNarrative({
  hook, niche, topic, nicheTemplate, framework,
  targetDurationSeconds, storyContext, keys,
}) {
  const openai = new OpenAI({ apiKey: keys.openaiKey });

  const frameworkScenes = framework
    ? (framework.sceneStructure[targetDurationSeconds] || framework.sceneStructure[framework.supportedDurations[0]])
    : null;

  const effectiveDuration = targetDurationSeconds || (framework?.supportedDurations[0]) || 60;
  const wordsPerSecond = framework?.pacing?.wordsPerSecond || 2.7;
  const totalWords = Math.round(effectiveDuration * wordsPerSecond);

  let sceneGuide;
  if (frameworkScenes) {
    sceneGuide = frameworkScenes.map((s, i) => {
      const midDur = Math.round((s.durationRange[0] + s.durationRange[1]) / 2);
      const wordTarget = Math.round(midDur * wordsPerSecond);
      return `Scene ${i + 1} "${s.label}" [${wordTarget} words, ${s.durationRange[0]}-${s.durationRange[1]}s]: ${s.beat}` +
        (s.overlayText ? ` | overlay: "${s.overlayText}"` : '');
    }).join('\n');
  } else {
    const sceneCounts = { 15: 3, 30: 3, 45: 4, 60: 5, 90: 7 };
    const count = sceneCounts[effectiveDuration] || 5;
    const perScene = Math.round(effectiveDuration / count);
    sceneGuide = Array.from({ length: count }, (_, i) =>
      `Scene ${i + 1} [${Math.round(perScene * wordsPerSecond)} words, ${perScene}s]`
    ).join('\n');
  }

  const narrativeBlock = framework?.narrative ? `
NARRATIVE FRAMEWORK: ${framework.name}
Arc: ${framework.narrative.narrativeArc}
Tone: ${framework.narrative.toneDescriptor}
${framework.narrative.forbiddenPatterns?.length ? `FORBIDDEN in this framework: ${framework.narrative.forbiddenPatterns.join('; ')}` : ''}
` : '';

  const categoryBlock = framework?.category === 'fast_paced'
    ? `PACING: Fast-paced. Each scene is a self-contained unit. No transitions between scenes. Hit the point immediately, deliver value, move on.`
    : `PACING: Story-driven. Each scene flows into the next like chapters of one story. Scene N's last sentence should create momentum into scene N+1. Never repeat information.`;

  const overlayBlock = framework?.textOverlays === 'required'
    ? 'Every scene MUST have overlay_text — 3-7 words of on-screen text reinforcing the narration.'
    : framework?.textOverlays === 'optional'
    ? 'Add overlay_text only where it adds clarity. Null otherwise.'
    : 'Set overlay_text to null for all scenes.';

  const systemPrompt = `You are writing a ${effectiveDuration}-second voiceover script. This will be spoken aloud as one continuous piece. Every word costs money to produce. Zero filler.

THE LOCKED HOOK (do NOT change this — it is the first sentence of Scene 1):
"${hook.hook}"

This hook promises the viewer: ${hook.payoff_promise}
Your script MUST deliver on this promise by the final scene.

${narrativeBlock}

SCENE STRUCTURE (${frameworkScenes?.length || 5} scenes, ${effectiveDuration}s total, ~${totalWords} words):
${sceneGuide}

WORD COUNT (violating this makes the video unwatchable):
- Total: ${totalWords - 8} to ${totalWords + 8} words.
- Count words in each scene carefully. The word_count field must be accurate.
- narration_full = all narration_segments joined with spaces. They must be identical.
- Scene 1 MUST start with the locked hook sentence verbatim.

${categoryBlock}

WRITING RULES:
1. Every sentence must advance the story or deliver new information. If you delete a sentence and nothing is lost, it shouldn't exist.
2. Use concrete details: specific numbers, names, places, dates. Never "some experts" or "many people."
3. Vary sentence length. Short punch after a long setup. Never three sentences of the same length in a row.
4. The final scene must deliver a satisfying payoff that fulfills the hook's promise. No vague endings.
5. Write for the ear, not the eye. Use contractions. Use "you" and "your."

EMOTIONAL BEATS:
Each scene should create a specific emotional shift. State what it is. Examples: "curiosity to surprise", "comfort to unease."

BANNED (instant rejection):
- Emdashes (—) or endashes (–). Use commas, periods, semicolons, or "and."
- Any of: buckle up, let's dive in, here's the thing, what if I told you, game-changer, mind-blowing, insane, literally, absolutely, at the end of the day, in today's world, it turns out, the truth is, picture this, imagine this, fast forward to, but here's the kicker, spoiler alert, the rest is history, needless to say, long story short, without further ado, brace yourself, you won't believe, think again, plot twist, but wait there's more, stay tuned, strap in, hold onto, let that sink in, deep dive, level up, hack your, pro tip
- Starting any sentence with "So," or "Now," or "See,"
- Rhetorical questions mid-script (only the hook can be a question, if the pattern calls for it)
- The word "actually" more than once in the entire script
- Addressing the viewer with "guys" or "folks"

${overlayBlock}

${nicheTemplate?.script_system_prompt || ''}`;

  const storyContextBlock = storyContext ? `\n\nSTORY CONTEXT:\n${storyContext}` : '';

  const userPrompt = topic
    ? `Write the full ${effectiveDuration}-second ${nicheTemplate?.name || niche} script about: ${topic}${storyContextBlock}`
    : `Write the full ${effectiveDuration}-second ${nicheTemplate?.name || niche} script. Pick something specific and surprising.${storyContextBlock}`;

  const completion = await openai.chat.completions.parse({
    model: 'gpt-4.1-mini-2025-04-14',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: zodResponseFormat(NarrativeDraftSchema, 'narrative_draft'),
    temperature: 0.9,
  });

  return { narrative: completion.choices[0].message.parsed, usage: completion.usage };
}

// ── PASS 3: Revision Pass ───────────────────────────────────────────────────

async function reviseNarrative({ narrative, hook, totalWords, keys }) {
  const openai = new OpenAI({ apiKey: keys.openaiKey });

  const currentWords = narrative.narration_full.split(/\s+/).length;
  const cliches = flagCliches(narrative.narration_full);
  const needsRevision = Math.abs(currentWords - totalWords) > 12 || cliches.length > 0;

  if (!needsRevision) {
    console.log(`[narrativeGenerator] Revision: SKIPPED (${currentWords} words, 0 clichés)`);
    return narrative;
  }

  console.log(`[narrativeGenerator] Revision: ${currentWords} words (target ${totalWords}), ${cliches.length} clichés: ${cliches.join(', ')}`);

  const systemPrompt = `You are a script editor. Tighten this voiceover script.

CURRENT SCRIPT:
"${narrative.narration_full}"

PROBLEMS TO FIX:
${Math.abs(currentWords - totalWords) > 12 ? `- Word count is ${currentWords}, must be ${totalWords - 8} to ${totalWords + 8}. ${currentWords > totalWords ? 'CUT words.' : 'ADD specific detail.'}` : ''}
${cliches.length > 0 ? `- Contains clichés: ${cliches.join(', ')}. Replace each with a specific, concrete phrase.` : ''}

RULES:
- First sentence must remain EXACTLY: "${hook.hook}"
- Do not change scene structure or order.
- Do not add or remove scenes.
- Maintain the same emotional arc and tone.
- Return the complete revised script split into the same scenes.`;

  try {
    const completion = await openai.chat.completions.parse({
      model: 'gpt-4.1-mini-2025-04-14',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Revise this script. Return the full revised version.' },
      ],
      response_format: zodResponseFormat(RevisionSchema, 'narrative_revision'),
      temperature: 0.3,
    });

    const revised = completion.choices[0].message.parsed;

    if (!revised.narration_full.startsWith(hook.hook.slice(0, 20))) {
      console.warn('[narrativeGenerator] Revision changed the hook — rejecting');
      return narrative;
    }

    narrative.narration_full = revised.narration_full;
    for (let i = 0; i < Math.min(revised.scenes.length, narrative.scenes.length); i++) {
      narrative.scenes[i].narration_segment = revised.scenes[i].narration_segment;
    }

    console.log(`[narrativeGenerator] Revision applied: ${revised.changes_made.length} changes, now ${revised.narration_full.split(/\s+/).length} words`);
    return narrative;
  } catch (err) {
    console.warn(`[narrativeGenerator] Revision failed, using original: ${err.message}`);
    return narrative;
  }
}

// ── Main export ─────────────────────────────────────────────────────────────

/**
 * Generate a narrative draft using hook-first, two-pass approach.
 * API-compatible with the original generateNarrative().
 */
export async function generateNarrative({
  niche, topic, hookLine, nicheTemplate, framework,
  targetDurationSeconds, storyContext, keys, brandUsername,
}) {
  if (!keys.openaiKey) throw new Error('OpenAI API key required');
  if (!nicheTemplate) throw new Error(`No template found for niche "${niche}"`);

  const effectiveDuration = targetDurationSeconds || (framework?.supportedDurations[0]) || 60;
  const wordsPerSecond = framework?.pacing?.wordsPerSecond || 2.7;
  const totalWords = Math.round(effectiveDuration * wordsPerSecond);

  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  // ── PASS 1: Hook ──────────────────────────────────────────────────
  let hook;
  if (hookLine) {
    hook = { hook: hookLine, hook_type: 'story', payoff_promise: 'Delivers on the opening promise' };
    console.log(`[narrativeGenerator] Pass 1: Using provided hook`);
  } else {
    console.log(`[narrativeGenerator] Pass 1: Generating hook...`);
    const hookResult = await generateHook({ niche, topic, nicheTemplate, framework, storyContext, keys });
    hook = hookResult;
    if (hookResult.usage) {
      totalInputTokens += hookResult.usage.prompt_tokens;
      totalOutputTokens += hookResult.usage.completion_tokens;
    }
  }

  // ── PASS 2: Full narrative ────────────────────────────────────────
  console.log(`[narrativeGenerator] Pass 2: Generating narrative (${totalWords} words, ${effectiveDuration}s)...`);
  const { narrative, usage: narrativeUsage } = await generateFullNarrative({
    hook, niche, topic, nicheTemplate, framework,
    targetDurationSeconds: effectiveDuration, storyContext, keys,
  });
  if (narrativeUsage) {
    totalInputTokens += narrativeUsage.prompt_tokens;
    totalOutputTokens += narrativeUsage.completion_tokens;
  }

  // Ensure hook is actually first
  if (!narrative.narration_full.startsWith(hook.hook.slice(0, 15))) {
    narrative.narration_full = hook.hook + ' ' + narrative.narration_full;
    if (narrative.scenes[0]) {
      narrative.scenes[0].narration_segment = hook.hook + ' ' + narrative.scenes[0].narration_segment;
    }
  }
  narrative.hook_line = hook.hook;

  // ── PASS 3: Revision ──────────────────────────────────────────────
  console.log(`[narrativeGenerator] Pass 3: Revision pass...`);
  const revised = await reviseNarrative({ narrative, hook, totalWords, keys });

  // ── Final safety: hard word count clamp ────────────────────────────
  const actualWords = revised.narration_full.split(/\s+/).length;
  const maxAllowed = totalWords + 15;
  if (actualWords > maxAllowed) {
    console.warn(`[narrativeGenerator] Word count ${actualWords} exceeds ${maxAllowed} — trimming`);
    const words = revised.narration_full.split(/\s+/);
    revised.narration_full = words.slice(0, maxAllowed).join(' ');
    let wordIdx = 0;
    for (const scene of revised.scenes) {
      const sceneWordTarget = Math.round((scene.duration_seconds || 5) * wordsPerSecond);
      const take = Math.min(sceneWordTarget, words.length - wordIdx);
      scene.narration_segment = words.slice(wordIdx, wordIdx + take).join(' ');
      wordIdx += take;
    }
  }

  // Extract hook_line fallback
  if (!revised.hook_line && revised.narration_full) {
    revised.hook_line = revised.narration_full.match(/^[^.!?]+[.!?]/)?.[0] || revised.narration_full.slice(0, 100);
  }

  if (brandUsername) {
    logCost({
      username: brandUsername,
      category: 'openai',
      operation: 'shorts_narrative_generation',
      model: 'gpt-4.1-mini',
      input_tokens: totalInputTokens,
      output_tokens: totalOutputTokens,
    });
  }

  const finalWords = revised.narration_full.split(/\s+/).length;
  console.log(`[narrativeGenerator] Final: "${revised.title}" — ${finalWords} words, ${revised.scenes.length} scenes`);

  return revised;
}
