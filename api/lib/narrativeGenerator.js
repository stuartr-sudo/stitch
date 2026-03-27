/**
 * Narrative Generator — Stage 1 of two-stage script generation.
 *
 * Produces words-only output: narration with hook, per-scene text segments.
 * NO visual or motion prompts — those come from sceneDirector.js (Stage 2)
 * after TTS timing is known.
 *
 * This separation means the narrative can be generated, TTS'd, and timestamped
 * before any visual decisions are made.
 */

import OpenAI from 'openai';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import { logCost } from './costLogger.js';

// ── Zod schema ──────────────────────────────────────────────────────────────

const NarrativeSceneSchema = z.object({
  scene_label: z.string().describe('Framework beat name for this scene (e.g., "Setup", "Reveal")'),
  narration_segment: z.string().describe('Voiceover text for this scene — word count must match per-scene target'),
  duration_seconds: z.number().describe('Target scene duration in seconds'),
  overlay_text: z.string().nullable().describe('On-screen text overlay (null if none)'),
});

const NarrativeDraftSchema = z.object({
  title: z.string().max(100).describe('Attention-grabbing title'),
  description: z.string().max(500).describe('Platform description for search/discovery'),
  hashtags: z.array(z.string()).max(15).describe('Relevant hashtags without # prefix'),
  hook_line: z.string().describe('The opening hook — first sentence that stops the scroll'),
  narration_full: z.string().describe('Complete voiceover text, all scenes concatenated naturally'),
  scenes: z.array(NarrativeSceneSchema),
  music_mood: z.string().describe('Background music mood/genre for music generation'),
});

/**
 * Generate a narrative draft (words-only, no visual prompts).
 *
 * @param {object} params
 * @param {string} params.niche - Niche key
 * @param {string} [params.topic] - Topic (auto-generated if omitted)
 * @param {string} [params.hookLine] - Pre-selected hook from topicDiscovery
 * @param {object} params.nicheTemplate - From shortsTemplates.js
 * @param {object} [params.framework] - Full framework object (with .narrative block)
 * @param {number} params.targetDurationSeconds - User's chosen duration (30/45/60/90)
 * @param {string} [params.storyContext] - Additional context for the narrative
 * @param {object} params.keys - { openaiKey }
 * @param {string} [params.brandUsername] - For cost logging
 * @returns {Promise<object>} Parsed NarrativeDraftSchema
 */
export async function generateNarrative({
  niche,
  topic,
  hookLine,
  nicheTemplate,
  framework,
  targetDurationSeconds,
  storyContext,
  keys,
  brandUsername,
}) {
  if (!keys.openaiKey) throw new Error('OpenAI API key required for narrative generation');
  if (!nicheTemplate) throw new Error(`No template found for niche "${niche}"`);

  const openai = new OpenAI({ apiKey: keys.openaiKey });

  // ── Build scene structure from framework or legacy template ─────────────
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
      return `Scene ${i + 1} "${s.label}" (${s.durationRange[0]}-${s.durationRange[1]}s, ~${wordTarget} words): ${s.beat}` +
        (s.overlayText ? ` — overlay: "${s.overlayText}"` : '');
    }).join('\n');
  } else {
    // Legacy fallback
    const sceneCounts = { 15: 3, 30: 3, 45: 4, 60: 5, 90: 7 };
    const count = sceneCounts[effectiveDuration] || 5;
    const perScene = Math.round(effectiveDuration / count);
    sceneGuide = Array.from({ length: count }, (_, i) =>
      `Scene ${i + 1} (${perScene}s, ~${Math.round(perScene * wordsPerSecond)} words)`
    ).join('\n');
  }

  // ── Build narrative-specific prompt blocks ──────────────────────────────
  const narrativeBlock = framework?.narrative ? `
NARRATIVE FRAMEWORK: ${framework.name}
Hook Pattern: ${framework.narrative.hookPattern}
Narrative Arc: ${framework.narrative.narrativeArc}
Tone: ${framework.narrative.toneDescriptor}
${framework.narrative.forbiddenPatterns?.length ? `FORBIDDEN in this framework: ${framework.narrative.forbiddenPatterns.join('; ')}` : ''}
${framework.narrative.hookExamples?.length ? `Hook examples (for inspiration, don't copy):\n${framework.narrative.hookExamples.map(h => `  - "${h}"`).join('\n')}` : ''}
` : '';

  const categoryBlock = framework?.category === 'fast_paced'
    ? 'Each scene is self-contained and punchy. No flowery transitions. Hit hard, move on.'
    : 'Scenes flow naturally into each other like a continuous story. Each picks up where the last left off.';

  const overlayBlock = framework?.textOverlays === 'required'
    ? 'overlay_text is REQUIRED for every scene — concise on-screen text (3-7 words) that reinforces narration.'
    : framework?.textOverlays === 'optional'
    ? 'overlay_text: add where it enhances clarity, null otherwise.'
    : 'overlay_text: set to null for all scenes.';

  const systemPrompt = `${nicheTemplate.script_system_prompt}
${narrativeBlock}
SCENE STRUCTURE (${frameworkScenes?.length || 5} scenes, ${effectiveDuration}s total):
${sceneGuide}

WORD BUDGET (highest priority — violating this makes the video unwatchable):
- Total narration MUST be ${totalWords - 10} to ${totalWords + 10} words. Count carefully before responding.
- Each scene's narration_segment MUST match its per-scene word target shown above (~${wordsPerSecond} words/sec).
- narration_full = all narration_segments joined naturally. This is what gets spoken aloud as one continuous voiceover.

NARRATION CONTINUITY:
- This is ONE continuous voiceover, not separate paragraphs.
- Each scene picks up exactly where the previous ended. Never repeat, contradict, or re-introduce.
- Build forward only. Think of it as one monologue broken into chapters.
${categoryBlock}

HOOK (most important sentence):
- The first sentence of Scene 1 is the hook. It must create an information gap — the viewer MUST need to know the answer.
${hookLine ? `- USE THIS HOOK (provided by user): "${hookLine}"` : '- Write a hook that would make someone stop scrolling mid-swipe.'}

WRITING QUALITY:
- Every sentence advances the story or delivers new information. Zero filler.
- Use concrete details: specific numbers, names, places, dates. Never "some experts" or "many people believe".
- Vary sentence rhythm. Short punches between longer setups. Never three long sentences in a row.
- End with a satisfying payoff that delivers on the hook's promise. No vague "think about it" endings.

${overlayBlock}

FORBIDDEN:
- Emdashes or endashes (use commas, periods, semicolons instead)
- Cliches: "buckle up", "let's dive in", "here's the thing", "what if I told you", "game-changer", "mind-blowing", "insane", "literally", "absolutely", "at the end of the day", "in today's world", "it turns out", "the truth is", "picture this", "imagine this"

IMPORTANT: You are generating NARRATION ONLY. Do NOT include visual_prompt or motion_prompt fields. Those are handled separately.`;

  const storyContextBlock = storyContext
    ? `\n\nSTORY CONTEXT (use as basis):\n${storyContext}`
    : '';

  const userPrompt = topic
    ? `Create a ${effectiveDuration}-second ${nicheTemplate.name} narrative about: ${topic}${storyContextBlock}`
    : `Create a ${effectiveDuration}-second ${nicheTemplate.name} narrative about a trending topic. Pick something specific and surprising.${storyContextBlock}`;

  const completion = await openai.chat.completions.parse({
    model: 'gpt-4.1-mini-2025-04-14',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: zodResponseFormat(NarrativeDraftSchema, 'narrative_draft'),
  });

  const narrative = completion.choices[0].message.parsed;

  // ── Word count safety net ──────────────────────────────────────────────
  const actualWords = narrative.narration_full.split(/\s+/).length;
  const maxAllowed = totalWords + 15;
  if (actualWords > maxAllowed) {
    console.warn(`[narrativeGenerator] Word count ${actualWords} exceeds budget ${totalWords}±15 — trimming to ${maxAllowed}`);
    const words = narrative.narration_full.split(/\s+/);
    narrative.narration_full = words.slice(0, maxAllowed).join(' ');
    let wordIdx = 0;
    for (const scene of narrative.scenes) {
      const sceneWordTarget = Math.round((scene.duration_seconds || 5) * wordsPerSecond);
      const take = Math.min(sceneWordTarget, words.length - wordIdx);
      scene.narration_segment = words.slice(wordIdx, wordIdx + take).join(' ');
      wordIdx += take;
    }
  }

  // Extract hook_line from first sentence if not already set
  if (!narrative.hook_line && narrative.narration_full) {
    const firstSentence = narrative.narration_full.match(/^[^.!?]+[.!?]/)?.[0] || narrative.narration_full.slice(0, 100);
    narrative.hook_line = firstSentence;
  }

  if (completion.usage && brandUsername) {
    logCost({
      username: brandUsername,
      category: 'openai',
      operation: 'shorts_narrative_generation',
      model: 'gpt-4.1-mini',
      input_tokens: completion.usage.prompt_tokens,
      output_tokens: completion.usage.completion_tokens,
    });
  }

  console.log(`[narrativeGenerator] Generated: "${narrative.title}" — ${narrative.narration_full.split(/\s+/).length} words, ${narrative.scenes.length} scenes`);
  return narrative;
}
