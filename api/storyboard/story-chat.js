/**
 * Conversational Story Builder — AI-guided story creation through chat.
 * In chat mode, acts as a story director guiding the user scene by scene.
 * In finalize mode, extracts structured story beats using Zod.
 */

import OpenAI from 'openai';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import { getUserKeys } from '../lib/getUserKeys.js';
import { logCost } from '../lib/costLogger.js';

const StoryBeatSchema = z.object({
  sceneNumber: z.number().describe('Sequential scene number starting from 1'),
  summary: z.string().describe('One-sentence summary of what happens in this scene'),
  setting: z.string().describe('Where this scene takes place — location, time of day, weather'),
  keyAction: z.string().describe('The main action or event in this scene'),
  emotion: z.string().describe('The dominant emotion or mood of this scene'),
});

const StoryBeatsSchema = z.object({
  storyTitle: z.string().max(100).describe('A compelling title for the story'),
  storyOverview: z.string().describe('A 2-3 sentence overview of the full story arc'),
  beats: z.array(StoryBeatSchema),
});

const STORY_DIRECTOR_SYSTEM_PROMPT = `You are a creative story director helping a user build a visual story scene by scene. Your job is to guide them through crafting a compelling narrative that will be turned into an AI-generated video sequence.

CONVERSATION RULES:
1. Be enthusiastic but concise — keep responses under 150 words.
2. After the user describes a scene or idea, acknowledge it briefly, then ask "And then what happens?" or a similar prompt to move the story forward.
3. Gently steer toward visual, cinematic storytelling — encourage descriptions of settings, actions, and emotions rather than dialogue.
4. If the user seems stuck, offer 2-3 brief suggestions they can pick from.
5. Keep track of how many scenes have been discussed and let the user know when they're approaching their target scene count.
6. When enough scenes are covered, suggest wrapping up: "That sounds like a great story! Ready to finalize it?"

METADATA (use this to guide pacing):
`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { openaiKey } = await getUserKeys(req.user.id, req.user.email);

    if (!openaiKey) {
      return res.status(400).json({ error: 'OpenAI API key not configured. Please add it in API Keys settings.' });
    }

    const {
      messages = [],
      numScenes = 4,
      mood = '',
      duration = 30,
      finalize = false,
    } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required and must not be empty' });
    }

    const openai = new OpenAI({ apiKey: openaiKey });
    const model = 'gpt-4.1-mini-2025-04-14';

    if (finalize) {
      // --- Finalize mode: extract structured story beats ---
      console.log(`[StoryChat] Finalizing story beats (${numScenes} scenes) for user ${req.user.email}`);

      const finalizeSystemPrompt = `You are a story analyst. Given a conversation between a user and a story director, extract the story into structured scene beats.
Extract exactly ${numScenes} scenes from the conversation. Each scene should have a clear setting, key action, and emotion.
If the conversation doesn't have enough distinct scenes, infer reasonable scene breaks from the narrative.
${mood ? `Overall mood/tone: ${mood}` : ''}
Target video duration: ${duration} seconds.`;

      const completion = await openai.chat.completions.parse({
        model,
        messages: [
          { role: 'system', content: finalizeSystemPrompt },
          ...messages,
        ],
        response_format: zodResponseFormat(StoryBeatsSchema, 'story_beats'),
      });

      const result = completion.choices[0].message.parsed;

      if (completion.usage && req.user?.email) {
        logCost({
          username: req.user.email.split('@')[0],
          category: 'openai',
          operation: 'storyboard_story_chat_finalize',
          model,
          input_tokens: completion.usage.prompt_tokens,
          output_tokens: completion.usage.completion_tokens,
        });
      }

      console.log(`[StoryChat] Finalized "${result.storyTitle}" — ${result.beats.length} beats`);

      return res.status(200).json({
        success: true,
        finalized: true,
        storyTitle: result.storyTitle,
        storyOverview: result.storyOverview,
        storyBeats: result.beats,
      });

    } else {
      // --- Chat mode: conversational story building ---
      console.log(`[StoryChat] Chat turn (${messages.length} messages) for user ${req.user.email}`);

      const metadataBlock = `- Target scenes: ${numScenes}
- Target duration: ${duration} seconds
${mood ? `- Mood/tone: ${mood}` : ''}`;

      const systemPrompt = STORY_DIRECTOR_SYSTEM_PROMPT + metadataBlock;

      const completion = await openai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
      });

      const reply = completion.choices[0].message.content;

      if (completion.usage && req.user?.email) {
        logCost({
          username: req.user.email.split('@')[0],
          category: 'openai',
          operation: 'storyboard_story_chat',
          model,
          input_tokens: completion.usage.prompt_tokens,
          output_tokens: completion.usage.completion_tokens,
        });
      }

      return res.status(200).json({
        success: true,
        finalized: false,
        reply,
      });
    }

  } catch (error) {
    console.error('[StoryChat] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
