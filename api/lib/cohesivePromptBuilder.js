import OpenAI from 'openai';

/**
 * Intelligently compose structured creative inputs into a single optimized
 * generation prompt using GPT-4.1-mini.  If no enhancements are provided
 * beyond the raw description, return the description as-is (no GPT call).
 */
export async function buildCohesivePrompt({
  description,
  style,
  tool = 'imagineer',
  lighting,
  cameraAngle,
  colorPalette,
  mood,
  negativePrompt,
  brandStyleGuide,
  videoStylePrompt,
  targetModel,
}, openaiKey) {
  // If nothing to merge — skip the GPT call
  if (!style && !lighting && !cameraAngle && !mood && !colorPalette && !videoStylePrompt && !brandStyleGuide) {
    return description;
  }

  const openai = new OpenAI({ apiKey: openaiKey });

  const sections = [];
  sections.push(`TOOL: ${tool}`);

  if (tool === 'imagineer') {
    sections.push('PURPOSE: Generate a high-quality text-to-image prompt for an AI image generator.');
  } else if (tool === 'edit') {
    sections.push('PURPOSE: Generate a high-quality image editing prompt.');
  } else if (tool === 'turnaround') {
    sections.push('PURPOSE: Generate a character turnaround sheet prompt.');
  } else if (tool === 'jumpstart') {
    sections.push('PURPOSE: Generate a video generation prompt from a starting image.');
  }

  if (description) sections.push(`DESCRIPTION: ${description}`);
  if (style) sections.push(`ARTISTIC STYLE: ${style}`);
  if (lighting) sections.push(`LIGHTING: ${lighting}`);
  if (cameraAngle) sections.push(`CAMERA ANGLE: ${cameraAngle}`);
  if (colorPalette) sections.push(`COLOR PALETTE: ${colorPalette}`);
  if (mood) sections.push(`MOOD: ${mood}`);
  if (videoStylePrompt) sections.push(`VIDEO STYLE / CINEMATOGRAPHY: ${videoStylePrompt}`);
  if (negativePrompt) sections.push(`THINGS TO AVOID: ${negativePrompt}`);

  if (brandStyleGuide && typeof brandStyleGuide === 'object') {
    const bsg = [];
    if (brandStyleGuide.brand_name) bsg.push(`Brand: ${brandStyleGuide.brand_name}`);
    if (brandStyleGuide.visual_style_notes) bsg.push(`Visual Style: ${brandStyleGuide.visual_style_notes}`);
    if (brandStyleGuide.mood_atmosphere) bsg.push(`Mood/Atmosphere: ${brandStyleGuide.mood_atmosphere}`);
    if (brandStyleGuide.lighting_prefs) bsg.push(`Lighting: ${brandStyleGuide.lighting_prefs}`);
    if (brandStyleGuide.composition_style) bsg.push(`Composition: ${brandStyleGuide.composition_style}`);
    if (brandStyleGuide.ai_prompt_rules) bsg.push(`AI Prompt Rules: ${brandStyleGuide.ai_prompt_rules}`);
    if (brandStyleGuide.preferred_elements) bsg.push(`Preferred: ${brandStyleGuide.preferred_elements}`);
    if (brandStyleGuide.prohibited_elements) bsg.push(`Prohibited: ${brandStyleGuide.prohibited_elements}`);
    if (bsg.length > 0) sections.push(`BRAND STYLE GUIDE:\n${bsg.join('\n')}`);
  }

  const systemPrompt = tool === 'jumpstart'
    ? `You are an expert AI video prompt engineer. Take structured creative inputs and produce a single, cohesive, highly detailed prompt for an AI video generator.\n\nRules:\n- Output ONLY the prompt text — no preamble, no explanation, no quotes\n- Weave all elements together naturally into flowing, cinematic descriptive text\n- Be extremely specific with visual details\n- Keep the prompt under 200 words — concise but vivid\n- Do NOT include any "AVOID:" section\n- Do NOT use copyrighted brand names (Pixar, Disney, etc.)`
    : `You are an expert AI image prompt engineer. Take structured creative inputs and produce a single, cohesive, highly detailed prompt for an AI image generator.\n\nRules:\n- Output ONLY the prompt text — no preamble, no explanation, no quotes\n- Weave all elements together naturally into flowing descriptive text\n- Be extremely specific with visual details (colors, materials, lighting, composition)\n- If a brand style guide is provided, ensure the visual style aligns\n- If negative/avoidance items are listed, end with "AVOID: [items]" as the final line`;

  try {
    // 30s timeout — if OpenAI hangs, fall back to raw description
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-mini-2025-04-14',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: sections.join('\n\n') },
      ],
      max_tokens: 800,
    }, { signal: controller.signal });

    clearTimeout(timeout);
    const result = (response.choices[0]?.message?.content || '').trim();
    console.log(`[cohesive-prompt] Tool: ${tool} | Length: ${result.length}`);
    return result || description;
  } catch (err) {
    const reason = err.name === 'AbortError' ? 'timeout (30s)' : err.message;
    console.error('[cohesive-prompt] Error:', reason, '— falling back to raw description');
    return description;
  }
}
