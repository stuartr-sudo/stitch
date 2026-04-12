/**
 * Gemini Native Video Analysis for Scene Chaining
 *
 * Uses @google/genai SDK with gemini-3-flash-preview to analyze
 * a generated video scene natively (1 FPS, audio + visual).
 *
 * Returns a text description used as `referenceDescription` by
 * the Cohesive Prompt Builder for the NEXT scene.
 *
 * This replaces the old approach of extracting frames manually
 * and sending them to GPT — Gemini processes video natively.
 */

import { GoogleGenAI } from '@google/genai';

/**
 * Analyze a video scene for continuity with the next scene.
 *
 * @param {string} videoUrl — URL of the generated video clip (must be downloadable)
 * @param {object} opts
 * @param {string} opts.sceneLabel — current scene's label (e.g., "The Spark")
 * @param {string} opts.nextSceneLabel — next scene's label (e.g., "First Attempt")
 * @param {string} opts.narration — current scene's narration text
 * @param {string} [opts.geminiKey] — Gemini API key (falls back to env)
 * @returns {Promise<string>} — text description for continuity
 */
export async function analyzeSceneVideo(videoUrl, opts = {}) {
  const {
    sceneLabel = 'Unknown',
    nextSceneLabel = 'Next scene',
    narration = '',
    geminiKey,
  } = opts;

  const apiKey = geminiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is required for video analysis');

  // Download the video and convert to base64
  const videoRes = await fetch(videoUrl);
  if (!videoRes.ok) throw new Error(`Failed to download video for analysis: ${videoRes.status}`);
  const videoBuffer = Buffer.from(await videoRes.arrayBuffer());

  // Check size — inline data supports up to ~20MB
  const sizeMB = videoBuffer.length / (1024 * 1024);
  if (sizeMB > 20) {
    console.warn(`[gemini-analyzer] Video is ${sizeMB.toFixed(1)}MB — may exceed inline limit`);
  }

  const base64Video = videoBuffer.toString('base64');

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `You are analyzing scene "${sceneLabel}" from a short-form video for visual continuity with the next scene "${nextSceneLabel}".

The narration for this scene was: "${narration}"

Analyze this video and describe:
1. CHARACTERS: Who is visible? Describe their appearance (clothing, hair, skin tone, build, facial features), position in frame, and pose at the END of the clip.
2. SETTING: What environment are they in? Describe specific details (furniture, objects, textures, background elements).
3. LIGHTING: Color temperature, direction, intensity, shadows. Be specific (e.g., "warm 3200K tungsten from camera-left, soft fill from window right").
4. COLOR PALETTE: Dominant colors in the frame, saturation level, any color grading.
5. MOOD: Emotional tone at the end of the scene.
6. ACTION: What motion occurred? Where did things end up?
7. FINAL FRAME STATE: Describe exactly what the last frame of the video looks like — this is what the next scene needs to continue from.

Be specific and visual — this description will be used to generate the NEXT scene's starting image for seamless continuity. Focus on concrete details, not abstract interpretations.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: 'video/mp4',
                data: base64Video,
              },
            },
            { text: prompt },
          ],
        },
      ],
    });

    const analysis = response.text || response.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!analysis) {
      console.warn('[gemini-analyzer] Empty analysis returned');
      return `Previous scene "${sceneLabel}" — no detailed analysis available. Continue with narrative context from narration: ${narration}`;
    }

    console.log(`[gemini-analyzer] Scene "${sceneLabel}" analyzed: ${analysis.length} chars`);
    return analysis;
  } catch (err) {
    console.error(`[gemini-analyzer] Error analyzing scene "${sceneLabel}":`, err.message);
    // Graceful fallback — return narration-based context so pipeline doesn't break
    return `Previous scene "${sceneLabel}" — video analysis failed. Continue based on narration context: ${narration}`;
  }
}
