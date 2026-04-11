/**
 * Post Format Templates
 *
 * Defines WHAT TYPE of post to create (listicle, quote card, before/after, etc.)
 * This is a layer ABOVE the visual style (image aesthetic) and carousel style (text layout).
 *
 * Hierarchy:
 *   Post Format  (WHAT to say - slide structure, content strategy, prompt overrides)
 *     -> Carousel Style  (HOW text is laid out - scrim, position, typography)
 *       -> Visual Style  (HOW it looks - photographic/artistic aesthetic)
 *
 * Shared between frontend (selector UI) and backend (content generation).
 */

export const FORMAT_CATEGORIES = [
  { value: 'educational', label: 'Educational', description: 'Teach your audience something' },
  { value: 'persuasion', label: 'Persuasion', description: 'Change minds and challenge thinking' },
  { value: 'storytelling', label: 'Storytelling', description: 'Engage through narrative' },
  { value: 'social_proof', label: 'Social Proof', description: 'Build trust and credibility' },
  { value: 'entertainment', label: 'Entertainment', description: 'Entertain and relate' },
  { value: 'promotional', label: 'Promotional', description: 'Announce and promote' },
];

export const POST_FORMAT_TEMPLATES = [
  // ─── Educational ────────────────────────────────────────────────────────────
  {
    value: 'educational_listicle',
    label: 'Educational Listicle',
    description: '5-10 actionable tips or lessons, one per slide',
    category: 'educational',
    slideStructure: {
      minSlides: 5,
      maxSlides: 10,
      pattern: [
        { role: 'hook', description: 'Count-based hook slide ("7 ways to...")', hasBody: false },
        { role: 'item', description: 'One numbered tip with supporting evidence', hasBody: true, repeats: true },
        { role: 'conclusion', description: 'Key takeaway or CTA', hasBody: true },
      ],
    },
    synthesisPrompt: `Extract a numbered list of 5-10 distinct, actionable tips or lessons from the source material. Each item must be specific and evidence-backed. Order them from most impactful to least. The hook should promise the exact count.`,
    writingPrompt: `Write one list item per slide. Each headline is the tip (max 8 words). Each body is the supporting evidence or example (1-2 sentences). Number the items in the headlines (e.g. "1. Start with the hardest task"). The final slide should NOT be another list item - it should be a clear takeaway or CTA.`,
    linkedinPrompt: `Write a LinkedIn post as a numbered list. Each item is a standalone insight. Open with a 1-line hook that promises the count. Keep each item to 1-2 sentences. End with a question or call to reflect.`,
    recommendedCarouselStyles: ['bold_editorial', 'clean_bottom', 'text_only'],
    defaultCarouselStyle: 'bold_editorial',
    platforms: {
      instagram: { suitability: 'excellent' },
      linkedin: { suitability: 'excellent' },
      tiktok: { suitability: 'good', note: 'Keep to 5-7 items max' },
      facebook: { suitability: 'good' },
    },
  },
  {
    value: 'data_infographic',
    label: 'Data / Stats',
    description: 'Lead with surprising numbers and data points',
    category: 'educational',
    slideStructure: {
      minSlides: 5,
      maxSlides: 8,
      pattern: [
        { role: 'hook', description: 'Headline stat that stops the scroll', hasBody: false },
        { role: 'stat', description: 'One data point with context', hasBody: true, repeats: true },
        { role: 'insight', description: 'What the data means', hasBody: true },
        { role: 'conclusion', description: 'So what? Action step', hasBody: true },
      ],
    },
    synthesisPrompt: `Extract the most surprising and specific data points, statistics, and numbers from the source material. Find 4-6 stats that build a compelling argument when presented sequentially. Each stat needs context (source, timeframe, comparison). Prioritize counterintuitive or little-known numbers.`,
    writingPrompt: `Each story slide should feature ONE stat prominently in the headline (e.g. "73% of teams fail at this"). The body provides context for why this number matters. Build from "here's the situation" to "here's what it means" to "here's what to do". The insight slide synthesizes the pattern across all stats. Keep stat headlines short and punchy.`,
    linkedinPrompt: `Write a LinkedIn post that leads with a surprising statistic. Follow with 2-3 more data points that build the argument. Explain what the data means and end with an actionable insight. Cite sources where possible.`,
    recommendedCarouselStyles: ['dark_cinematic', 'bold_editorial', 'text_only'],
    defaultCarouselStyle: 'dark_cinematic',
    platforms: {
      instagram: { suitability: 'excellent' },
      linkedin: { suitability: 'excellent' },
      tiktok: { suitability: 'fair', note: 'Simplify to 3-4 key stats' },
      facebook: { suitability: 'good' },
    },
  },
  {
    value: 'step_by_step',
    label: 'Step-by-Step',
    description: 'Numbered process or tutorial walkthrough',
    category: 'educational',
    slideStructure: {
      minSlides: 5,
      maxSlides: 9,
      pattern: [
        { role: 'hook', description: 'Promise the outcome ("How to X in Y steps")', hasBody: false },
        { role: 'step', description: 'One numbered step with brief instructions', hasBody: true, repeats: true },
        { role: 'conclusion', description: 'Expected result or next action', hasBody: true },
      ],
    },
    synthesisPrompt: `Break down the topic into a clear, sequential process with 4-7 concrete steps. Each step must be actionable (starts with a verb) and specific enough to follow immediately. Include expected outcomes or common pitfalls for each step.`,
    writingPrompt: `Number each step slide ("Step 1:", "Step 2:", etc.) in the headline followed by the action (max 8 words). The body explains HOW to do it or WHY this step matters (1-2 sentences). Steps must be in logical order - each builds on the previous. The conclusion slide should describe the result the reader will achieve.`,
    linkedinPrompt: `Write a LinkedIn post as a step-by-step guide. Number each step and make it actionable (start with a verb). Keep explanations to 1 sentence per step. Open with the promise of what the reader will achieve.`,
    recommendedCarouselStyles: ['clean_bottom', 'bold_editorial', 'side_strip'],
    defaultCarouselStyle: 'clean_bottom',
    platforms: {
      instagram: { suitability: 'excellent' },
      linkedin: { suitability: 'excellent' },
      tiktok: { suitability: 'good', note: 'Keep to 5 steps max' },
      facebook: { suitability: 'good' },
    },
  },
  {
    value: 'checklist',
    label: 'Checklist',
    description: 'Actionable checklist items readers can follow',
    category: 'educational',
    slideStructure: {
      minSlides: 5,
      maxSlides: 9,
      pattern: [
        { role: 'hook', description: 'What this checklist helps you achieve', hasBody: false },
        { role: 'check', description: 'One checklist item with brief context', hasBody: true, repeats: true },
        { role: 'conclusion', description: 'Summary or CTA to save/bookmark', hasBody: true },
      ],
    },
    synthesisPrompt: `Create a practical checklist of 4-7 items that the reader can use immediately. Each item should be specific and verifiable (you either did it or you didn't). Order from most critical to nice-to-have. Include why each item matters.`,
    writingPrompt: `Each checklist slide headline should be a clear, actionable item (max 8 words). The body briefly explains why this item matters or how to do it (1 sentence). The conclusion slide should encourage the reader to save or share the checklist. DO NOT use checkbox emojis - the visual design handles that.`,
    linkedinPrompt: `Write a LinkedIn post as a checklist. Each item should be on its own line, clear and actionable. Open with what completing this checklist achieves. End by asking readers what they'd add.`,
    recommendedCarouselStyles: ['text_only', 'clean_bottom', 'side_strip'],
    defaultCarouselStyle: 'text_only',
    platforms: {
      instagram: { suitability: 'excellent' },
      linkedin: { suitability: 'excellent' },
      tiktok: { suitability: 'fair', note: 'Keep to 4-5 items' },
      facebook: { suitability: 'good' },
    },
  },
  {
    value: 'comparison',
    label: 'Comparison',
    description: '"X vs Y" side-by-side analysis',
    category: 'educational',
    slideStructure: {
      minSlides: 5,
      maxSlides: 8,
      pattern: [
        { role: 'hook', description: '"X vs Y" hook that sets up the comparison', hasBody: false },
        { role: 'dimension', description: 'One comparison dimension (cost, speed, quality, etc.)', hasBody: true, repeats: true },
        { role: 'verdict', description: 'The clear recommendation or conclusion', hasBody: true },
      ],
    },
    synthesisPrompt: `Identify the two things being compared and 4-6 meaningful dimensions to compare them on (e.g. cost, ease of use, scalability, speed). For each dimension, extract specific evidence for both sides. Determine a clear winner or "it depends" with conditions.`,
    writingPrompt: `Each comparison slide headline names the dimension (e.g. "Speed", "Cost", "Learning Curve"). The body gives the verdict for that dimension with specific evidence for both sides. Be fair but decisive - don't hedge. The verdict slide gives the overall recommendation with conditions ("Choose X if..., Choose Y if...").`,
    linkedinPrompt: `Write a LinkedIn post comparing two approaches/tools/methods. Cover 3-4 key dimensions with a clear verdict for each. Be specific with evidence. End with a clear recommendation and ask which one readers prefer.`,
    recommendedCarouselStyles: ['bold_editorial', 'side_strip', 'text_only'],
    defaultCarouselStyle: 'bold_editorial',
    platforms: {
      instagram: { suitability: 'excellent' },
      linkedin: { suitability: 'excellent' },
      tiktok: { suitability: 'good' },
      facebook: { suitability: 'good' },
    },
  },

  // ─── Persuasion ─────────────────────────────────────────────────────────────
  {
    value: 'myth_vs_reality',
    label: 'Myth vs Reality',
    description: 'Debunk common misconceptions one by one',
    category: 'persuasion',
    slideStructure: {
      minSlides: 5,
      maxSlides: 9,
      pattern: [
        { role: 'hook', description: 'Provocative hook challenging common belief', hasBody: false },
        { role: 'myth', description: 'State the myth then reveal the reality', hasBody: true, repeats: true },
        { role: 'conclusion', description: 'The real takeaway', hasBody: true },
      ],
    },
    synthesisPrompt: `Identify 3-5 common misconceptions or myths about this topic. For each myth, find the specific evidence that disproves it. The myths should be beliefs the target audience actually holds, not strawmen. Order from most widely believed to most surprising.`,
    writingPrompt: `Each myth slide has a headline starting with "MYTH:" followed by the misconception (max 10 words). The body starts with "REALITY:" followed by the truth with specific evidence (1-2 sentences). Make the contrast stark and surprising. The conclusion slide synthesizes the real lesson behind all the myths.`,
    linkedinPrompt: `Write a LinkedIn post debunking 3-4 common myths. For each, state the myth then the reality with evidence. Open with a bold claim that most people get this wrong. End by asking which myth surprised readers most.`,
    recommendedCarouselStyles: ['dark_cinematic', 'bold_editorial', 'text_only'],
    defaultCarouselStyle: 'dark_cinematic',
    platforms: {
      instagram: { suitability: 'excellent' },
      linkedin: { suitability: 'excellent' },
      tiktok: { suitability: 'good' },
      facebook: { suitability: 'good' },
    },
  },
  {
    value: 'problem_solution',
    label: 'Problem / Solution',
    description: 'Agitate a pain point, then present the answer',
    category: 'persuasion',
    slideStructure: {
      minSlides: 5,
      maxSlides: 8,
      pattern: [
        { role: 'hook', description: 'Name the problem the audience feels', hasBody: false },
        { role: 'pain', description: 'Dig deeper into the pain point', hasBody: true, repeats: true },
        { role: 'pivot', description: 'The turning point or insight', hasBody: true },
        { role: 'solution', description: 'The solution or approach', hasBody: true, repeats: true },
        { role: 'conclusion', description: 'CTA or next step', hasBody: true },
      ],
    },
    synthesisPrompt: `Identify the core problem the audience faces and 2-3 specific pain points that make it worse. Then extract the key insight or solution from the source material. The solution should be specific and actionable, not vague advice. Find evidence that the solution works.`,
    writingPrompt: `Structure: 1 hook slide naming the problem, 1-2 slides deepening the pain (make the reader feel it), 1 pivot slide revealing the key insight, 1-2 slides explaining the solution with specifics, 1 conclusion with clear next step. The pivot slide is the most important - it should feel like an "aha" moment.`,
    linkedinPrompt: `Write a LinkedIn post that opens by naming a problem the reader recognizes. Deepen the pain briefly, then pivot to a specific solution. Keep the solution actionable and evidence-backed. End with a clear next step.`,
    recommendedCarouselStyles: ['bold_editorial', 'dark_cinematic', 'clean_bottom'],
    defaultCarouselStyle: 'bold_editorial',
    platforms: {
      instagram: { suitability: 'excellent' },
      linkedin: { suitability: 'excellent' },
      tiktok: { suitability: 'good' },
      facebook: { suitability: 'good' },
    },
  },
  {
    value: 'hot_take',
    label: 'Hot Take',
    description: 'Bold opinion that challenges the status quo',
    category: 'persuasion',
    slideStructure: {
      minSlides: 4,
      maxSlides: 7,
      pattern: [
        { role: 'hook', description: 'The bold, provocative claim', hasBody: false },
        { role: 'evidence', description: 'Why this take is right - with proof', hasBody: true, repeats: true },
        { role: 'nuance', description: 'The caveat or when this doesn\'t apply', hasBody: true },
        { role: 'conclusion', description: 'The call to think differently', hasBody: true },
      ],
    },
    synthesisPrompt: `Identify the most controversial or counterintuitive angle in this topic. Find 2-4 pieces of evidence that support the contrarian view. Also identify the nuance - when does the hot take NOT apply? The take should be defensible, not just inflammatory.`,
    writingPrompt: `The hook should be a single bold statement that makes the reader disagree (then swipe to understand). Evidence slides should each present one reason the take is right, with specific proof. The nuance slide shows intellectual honesty ("This doesn't apply when..."). The conclusion reframes the original claim with context.`,
    linkedinPrompt: `Write a LinkedIn post with a bold opening claim that challenges conventional wisdom. Support it with 2-3 specific pieces of evidence. Acknowledge the nuance. End by inviting debate or asking readers to share their perspective.`,
    recommendedCarouselStyles: ['text_only', 'dark_cinematic', 'bold_editorial'],
    defaultCarouselStyle: 'text_only',
    platforms: {
      instagram: { suitability: 'good' },
      linkedin: { suitability: 'excellent' },
      tiktok: { suitability: 'fair' },
      facebook: { suitability: 'good' },
    },
  },

  // ─── Storytelling ───────────────────────────────────────────────────────────
  {
    value: 'before_after',
    label: 'Before / After',
    description: 'Show a transformation with clear contrast',
    category: 'storytelling',
    slideStructure: {
      minSlides: 5,
      maxSlides: 7,
      pattern: [
        { role: 'hook', description: 'Tease the transformation', hasBody: false },
        { role: 'before', description: 'The "before" state with specific details', hasBody: true, repeats: true },
        { role: 'pivot', description: 'What changed', hasBody: true },
        { role: 'after', description: 'The "after" state with specific results', hasBody: true, repeats: true },
        { role: 'conclusion', description: 'How the reader can achieve the same', hasBody: true },
      ],
    },
    synthesisPrompt: `Identify a clear transformation: what was the starting state and what is the end state? Find specific, measurable details for both (numbers, timelines, concrete changes). Identify the key catalyst or turning point that drove the change.`,
    writingPrompt: `"Before" slides should paint a vivid picture of the old state with specific details. The pivot slide reveals what changed (a decision, discovery, or action). "After" slides show the new state with measurable results. Headlines should use clear "Before:" and "After:" prefixes. The conclusion tells the reader how to start their own transformation.`,
    linkedinPrompt: `Write a LinkedIn post showing a before/after transformation. Be specific about the starting state and end result with measurable outcomes. Explain the key turning point. End by telling readers how they can achieve similar results.`,
    recommendedCarouselStyles: ['bold_editorial', 'dark_cinematic', 'clean_bottom'],
    defaultCarouselStyle: 'bold_editorial',
    platforms: {
      instagram: { suitability: 'excellent' },
      linkedin: { suitability: 'excellent' },
      tiktok: { suitability: 'excellent' },
      facebook: { suitability: 'good' },
    },
  },
  {
    value: 'carousel_story',
    label: 'Story Arc',
    description: 'Narrative arc across slides: hook, tension, resolution',
    category: 'storytelling',
    slideStructure: {
      minSlides: 6,
      maxSlides: 10,
      pattern: [
        { role: 'hook', description: 'Opening scene or question', hasBody: false },
        { role: 'setup', description: 'Set the scene and introduce characters/context', hasBody: true },
        { role: 'tension', description: 'Build tension or conflict', hasBody: true, repeats: true },
        { role: 'climax', description: 'The turning point or revelation', hasBody: true },
        { role: 'resolution', description: 'What happened as a result', hasBody: true },
        { role: 'conclusion', description: 'The lesson or takeaway', hasBody: true },
      ],
    },
    synthesisPrompt: `Find the narrative in this material. Identify the key character or situation, the central conflict or challenge, the turning point, and the resolution. Extract specific details that make the story vivid (names, places, dates, sensory details). The story must have genuine tension.`,
    writingPrompt: `Tell a story across the slides. Each slide advances the plot - no filler, no tangents. The hook opens with a moment of intrigue. Setup slides establish context quickly. Tension slides raise the stakes. The climax is the moment everything changes. Resolution shows the outcome. Conclusion distills the universal lesson. Use vivid, concrete language throughout.`,
    linkedinPrompt: `Write a LinkedIn post that tells a story. Open with a vivid scene or moment. Build tension through specific details. Deliver a clear turning point. End with the lesson and what readers can learn from it.`,
    recommendedCarouselStyles: ['dark_cinematic', 'magazine', 'bold_editorial'],
    defaultCarouselStyle: 'dark_cinematic',
    platforms: {
      instagram: { suitability: 'excellent' },
      linkedin: { suitability: 'excellent' },
      tiktok: { suitability: 'good' },
      facebook: { suitability: 'good' },
    },
  },
  {
    value: 'behind_the_scenes',
    label: 'Behind the Scenes',
    description: 'Show the real process, mistakes, and learnings',
    category: 'storytelling',
    slideStructure: {
      minSlides: 5,
      maxSlides: 8,
      pattern: [
        { role: 'hook', description: 'Tease what people don\'t usually see', hasBody: false },
        { role: 'reveal', description: 'Show the real process or truth', hasBody: true, repeats: true },
        { role: 'lesson', description: 'What was learned from this', hasBody: true },
        { role: 'conclusion', description: 'Takeaway or invitation to engage', hasBody: true },
      ],
    },
    synthesisPrompt: `Find the behind-the-scenes angle: what is the real process, the messy truth, or the unexpected reality? Identify 3-5 specific reveals that would surprise or educate the audience. Each reveal should challenge an assumption about how things work.`,
    writingPrompt: `Each reveal slide should show something the audience doesn't normally see. Use "What you see:" / "What actually happens:" framing in headlines. Be honest and specific - vague "it's harder than you think" slides are weak. The lesson slide synthesizes what all the reveals teach. The conclusion invites engagement.`,
    linkedinPrompt: `Write a LinkedIn post pulling back the curtain on a process or experience. Share 3-4 specific things people don't usually see. Be honest about challenges and mistakes. End with what you learned and ask readers to share their own BTS experience.`,
    recommendedCarouselStyles: ['clean_bottom', 'bold_editorial', 'minimal_center'],
    defaultCarouselStyle: 'clean_bottom',
    platforms: {
      instagram: { suitability: 'excellent' },
      linkedin: { suitability: 'excellent' },
      tiktok: { suitability: 'excellent' },
      facebook: { suitability: 'good' },
    },
  },

  // ─── Social Proof ───────────────────────────────────────────────────────────
  {
    value: 'testimonial',
    label: 'Testimonial',
    description: 'Customer quote with context and results',
    category: 'social_proof',
    slideStructure: {
      minSlides: 4,
      maxSlides: 7,
      pattern: [
        { role: 'hook', description: 'Teaser of the result or transformation', hasBody: false },
        { role: 'context', description: 'Who they are and what they needed', hasBody: true },
        { role: 'quote', description: 'The testimonial quote itself', hasBody: true },
        { role: 'results', description: 'Specific measurable outcomes', hasBody: true },
        { role: 'conclusion', description: 'CTA or how to get similar results', hasBody: true },
      ],
    },
    synthesisPrompt: `Extract or construct a compelling customer story: who they are (role, company, situation), what problem they faced, the key testimonial quote or outcome, and specific measurable results. If the source doesn't contain a direct testimonial, synthesize the strongest evidence of value.`,
    writingPrompt: `The hook should tease the result (e.g. "From struggling to 3x growth in 6 months"). The context slide briefly introduces the person and their challenge. The quote slide features the testimonial prominently in the headline. Results slides show specific numbers. Keep it genuine - no hyperbole. The conclusion slide tells the reader how to achieve similar results.`,
    linkedinPrompt: `Write a LinkedIn post sharing a customer success story. Open with the result, give brief context about who they are and their challenge, share their words, and highlight specific outcomes. End with how others can achieve the same.`,
    recommendedCarouselStyles: ['minimal_center', 'magazine', 'text_only'],
    defaultCarouselStyle: 'minimal_center',
    platforms: {
      instagram: { suitability: 'good' },
      linkedin: { suitability: 'excellent' },
      tiktok: { suitability: 'fair' },
      facebook: { suitability: 'good' },
    },
  },

  // ─── Entertainment ──────────────────────────────────────────────────────────
  {
    value: 'quote_card',
    label: 'Quote Card',
    description: 'Powerful quote with attribution and context',
    category: 'entertainment',
    slideStructure: {
      minSlides: 3,
      maxSlides: 5,
      pattern: [
        { role: 'hook', description: 'Lead-in that makes the quote feel urgent', hasBody: false },
        { role: 'quote', description: 'The quote itself, large and prominent', hasBody: true, repeats: true },
        { role: 'conclusion', description: 'Attribution and context', hasBody: true },
      ],
    },
    synthesisPrompt: `Find the most powerful, shareable quote or insight from the source material. If there's a direct quote from a notable person, use it. Otherwise, distill the core insight into a quotable statement. Find 1-3 supporting quotes that build on the theme.`,
    writingPrompt: `Quote slides should feature the quote in the headline (short, punchy, under 15 words) with attribution in the body. For multi-quote carousels, each quote should build on the previous. For single-quote carousels, the hook sets context, the quote dominates, and the conclusion provides the "so what". Keep it minimal - let the words breathe.`,
    linkedinPrompt: `Write a LinkedIn post centered around a powerful quote or insight. Provide brief context for why this quote matters right now. Keep the post focused - the quote is the star. End with your own reflection on what it means.`,
    recommendedCarouselStyles: ['text_only', 'minimal_center', 'dark_cinematic'],
    defaultCarouselStyle: 'text_only',
    platforms: {
      instagram: { suitability: 'excellent' },
      linkedin: { suitability: 'excellent' },
      tiktok: { suitability: 'fair' },
      facebook: { suitability: 'excellent' },
    },
  },
  {
    value: 'meme_humor',
    label: 'Relatable / Humor',
    description: 'Funny, relatable content that drives shares',
    category: 'entertainment',
    slideStructure: {
      minSlides: 3,
      maxSlides: 6,
      pattern: [
        { role: 'hook', description: 'The relatable setup or observation', hasBody: false },
        { role: 'beat', description: 'Build the humor with escalating scenarios', hasBody: true, repeats: true },
        { role: 'punchline', description: 'The payoff or twist', hasBody: true },
        { role: 'conclusion', description: 'Light CTA ("tag someone who...")', hasBody: true },
      ],
    },
    synthesisPrompt: `Find the humorous or relatable angle in this topic. Identify shared experiences the audience recognizes ("every [role] knows this feeling"). Look for absurd contrasts, universal frustrations, or ironic observations. The humor should come from truth, not forced jokes.`,
    writingPrompt: `The hook should be instantly recognizable ("POV: you just..." or "Nobody: / [Role]:"). Each beat slide escalates the humor or adds another relatable scenario. The punchline is the biggest laugh or the most "too real" moment. Keep text SHORT - humor dies in long paragraphs. The conclusion is a light engagement prompt. NO forced corporate humor.`,
    linkedinPrompt: `Write a LinkedIn post with a humorous, relatable observation about the topic. Use specific scenarios the audience will recognize. Keep it light and genuine - not trying too hard. End with something that invites reactions or tags.`,
    recommendedCarouselStyles: ['text_only', 'bold_editorial', 'clean_bottom'],
    defaultCarouselStyle: 'text_only',
    platforms: {
      instagram: { suitability: 'excellent' },
      linkedin: { suitability: 'good' },
      tiktok: { suitability: 'excellent' },
      facebook: { suitability: 'excellent' },
    },
  },

  // ─── Promotional ────────────────────────────────────────────────────────────
  {
    value: 'announcement',
    label: 'Announcement',
    description: 'Product launch, milestone, or news announcement',
    category: 'promotional',
    slideStructure: {
      minSlides: 4,
      maxSlides: 7,
      pattern: [
        { role: 'hook', description: 'Teaser or "big news" hook', hasBody: false },
        { role: 'reveal', description: 'The announcement itself', hasBody: true },
        { role: 'detail', description: 'Key features, details, or benefits', hasBody: true, repeats: true },
        { role: 'conclusion', description: 'How to get involved or next steps', hasBody: true },
      ],
    },
    synthesisPrompt: `Identify what's being announced and why it matters to the audience. Extract 3-5 key details, features, or benefits. Find the most compelling angle - what makes this announcement worth caring about? Determine the clear CTA.`,
    writingPrompt: `The hook should create anticipation without revealing everything. The reveal slide is the main announcement - clear and exciting. Detail slides highlight key benefits or features (one per slide, most important first). The conclusion gives a clear next step (link, date, action). Keep the tone excited but not hyperbolic.`,
    linkedinPrompt: `Write a LinkedIn post announcing something new. Build brief anticipation, make the announcement clearly, highlight 2-3 key benefits, and end with a clear next step or CTA.`,
    recommendedCarouselStyles: ['bold_editorial', 'dark_cinematic', 'minimal_center'],
    defaultCarouselStyle: 'bold_editorial',
    platforms: {
      instagram: { suitability: 'excellent' },
      linkedin: { suitability: 'excellent' },
      tiktok: { suitability: 'good' },
      facebook: { suitability: 'excellent' },
    },
  },
  {
    value: 'case_study',
    label: 'Case Study',
    description: 'Deep dive into a specific success story with results',
    category: 'promotional',
    slideStructure: {
      minSlides: 6,
      maxSlides: 10,
      pattern: [
        { role: 'hook', description: 'The headline result or transformation', hasBody: false },
        { role: 'challenge', description: 'The problem or starting point', hasBody: true },
        { role: 'approach', description: 'What was done to solve it', hasBody: true, repeats: true },
        { role: 'results', description: 'Specific measurable outcomes', hasBody: true, repeats: true },
        { role: 'conclusion', description: 'Key lesson and CTA', hasBody: true },
      ],
    },
    synthesisPrompt: `Structure this as a case study: identify the subject, the challenge they faced, the approach taken (with specific details), and the measurable results. Find 2-4 distinct result metrics. Extract the universal lesson that other businesses can apply.`,
    writingPrompt: `The hook should lead with the most impressive result. Challenge slides paint the "before" picture. Approach slides explain what was done (be specific - not "we optimized" but "we changed X to Y"). Result slides each highlight one metric with context. The conclusion distills the replicable lesson. This should read like a mini case study, not an ad.`,
    linkedinPrompt: `Write a LinkedIn post structured as a brief case study. Lead with the result, explain the challenge, describe the approach taken (with specifics), share measurable outcomes, and end with the key lesson others can apply.`,
    recommendedCarouselStyles: ['clean_bottom', 'bold_editorial', 'side_strip'],
    defaultCarouselStyle: 'clean_bottom',
    platforms: {
      instagram: { suitability: 'good' },
      linkedin: { suitability: 'excellent' },
      tiktok: { suitability: 'fair' },
      facebook: { suitability: 'good' },
    },
  },
];

// ─── Lookup helpers ────────────────────────────────────────────────────────────

export function getPostFormat(value) {
  return POST_FORMAT_TEMPLATES.find(t => t.value === value) || null;
}

export function getFormatsForPlatform(platform) {
  return POST_FORMAT_TEMPLATES.filter(t => {
    const ps = t.platforms[platform];
    return ps && ps.suitability !== 'poor';
  });
}

export function getFormatsByCategory(category) {
  return POST_FORMAT_TEMPLATES.filter(t => t.category === category);
}
