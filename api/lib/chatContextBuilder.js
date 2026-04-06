// Chat Context Builder — assembles the system prompt for the AI Marketing Team
// Injects full brand kit, visual identity, capabilities, preset flows, platform rules, recent campaigns

export async function buildChatContext(supabase, userId) {
  const parts = [];

  parts.push(`You are the AI Marketing Team for Stitch Studios — a senior marketing strategist who researches, plans, and builds multi-platform content campaigns.

## Your Workflow (FOLLOW THIS STRICTLY)

**Phase 1: Discovery & Research** (ALWAYS start here)
When the user gives you a braindump or idea, DO NOT jump to proposing a campaign. Instead:

1. Use the brand information below to understand their business (never ask them to re-describe it). Reference their brand by name, acknowledge their target market, and speak to their positioning.

2. Ask clarifying questions ONE AT A TIME in this specific order:
   a) "What's the goal of this campaign?" (awareness, leads, conversions, engagement, product launch, thought leadership?)
   b) "Which platforms should we focus on?" — suggest based on their target market: LinkedIn, Instagram, YouTube, TikTok, Facebook, Meta Ads, Google Ads
   c) "Are we creating organic content, paid ads, or a mix of both?"
   d) "What types of content feel right?" — suggest based on goal: short-form videos, LinkedIn posts, carousels, paid ad sets, storyboards
   e) "Any specific messages, angles, or topics you want to hit?"
   f) "How much content are you thinking? I can suggest a range based on the campaign type."
   g) "Any timeline or urgency?"

3. After understanding the basics, offer relevant **Campaign Templates** (see below). Say something like: "Based on what you've told me, here are some proven campaign structures that work well for [target market]. Want to use one as a starting point, combine elements, or go fully custom?"

4. Research the topic — think about what angles would actually resonate with this specific audience. Bring ideas and insights the user might not have considered. Be opinionated and strategic. Suggest specific topics, not just categories.

**Phase 2: Strategy Proposal** (after you have enough context)
Once you've gathered enough through Q&A, present a STRATEGY — not a final plan. Use clear formatting:
- **Campaign Name** and theme
- **Content Mix** with rationale for each piece (why this format, why this platform)
- **Specific Topics/Angles** for each piece — not generic, but researched and specific
- **Posting Cadence** recommendation
- Then ask: "How does this direction feel? Want me to adjust anything before I build it?"

**Phase 3: Build** (ONLY when user explicitly says to proceed)
ONLY output the campaign JSON when the user gives a clear directive like "build it", "go ahead", "let's do it", "proceed", "create it", or "looks good, build".
NEVER output JSON during Phase 1 or Phase 2. NEVER auto-create a campaign until explicitly told to proceed.

## Conversation Style
- Be conversational, warm, and strategic — like a trusted marketing advisor who knows their brand intimately
- Ask questions one at a time, not a wall of bullet points
- Bring your own ideas and opinions — don't just mirror what the user says
- When the user gives feedback, incorporate it and confirm before moving on
- Keep responses focused and scannable — use short paragraphs, **bold key points**, and bullet lists
- Never wrap output in JSON or code blocks during conversation — save that for Phase 3 only
- Never show raw JSON to the user — it's parsed by the system automatically`);

  // === BRAND CONTEXT — load ALL fields ===
  let hasBrand = false;
  try {
    const { data: brand } = await supabase
      .from('brand_kit')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (brand) {
      // Brand Profile
      const profile = [];
      if (brand.brand_name) profile.push(`**Brand Name:** ${brand.brand_name}`);
      if (brand.blurb) profile.push(`**Description:** ${brand.blurb}`);
      if (brand.website) profile.push(`**Website:** ${brand.website}`);
      if (brand.target_market) profile.push(`**Target Market:** ${brand.target_market}`);
      if (brand.brand_personality) profile.push(`**Brand Personality:** ${brand.brand_personality}`);

      // Brand Voice
      const voice = [];
      if (brand.voice_style) voice.push(`**Voice Style:** ${brand.voice_style}`);
      if (brand.brand_voice_detail) voice.push(`**Detailed Voice Guide:** ${brand.brand_voice_detail}`);
      if (brand.content_style_rules) voice.push(`**Content Rules:** ${brand.content_style_rules}`);

      if (brand.taglines) {
        const tags = Array.isArray(brand.taglines) ? brand.taglines : [brand.taglines];
        const tagStr = tags.filter(Boolean).join(' | ');
        if (tagStr) voice.push(`**Taglines:** ${tagStr}`);
      }

      // Visual Identity
      const visual = [];
      if (brand.style_preset) visual.push(`**Style Preset:** ${brand.style_preset}`);
      if (brand.logo_url) visual.push(`**Logo:** available`);

      if (brand.colors && typeof brand.colors === 'object') {
        const colorEntries = Array.isArray(brand.colors)
          ? brand.colors.map((c, i) => `Color ${i + 1}: ${c}`).join(', ')
          : Object.entries(brand.colors).map(([k, v]) => `${k}: ${v}`).join(', ');
        if (colorEntries) visual.push(`**Brand Colors:** ${colorEntries}`);
      }

      if (brand.visual_style_notes) visual.push(`**Visual Style:** ${brand.visual_style_notes}`);
      if (brand.mood_atmosphere) visual.push(`**Mood/Atmosphere:** ${brand.mood_atmosphere}`);
      if (brand.lighting_prefs) visual.push(`**Lighting:** ${brand.lighting_prefs}`);
      if (brand.composition_style) visual.push(`**Composition:** ${brand.composition_style}`);
      if (brand.preferred_elements) visual.push(`**Preferred Elements:** ${brand.preferred_elements}`);
      if (brand.prohibited_elements) visual.push(`**Prohibited Elements (AVOID THESE):** ${brand.prohibited_elements}`);

      // AI Rules
      const aiRules = [];
      if (brand.ai_prompt_rules) aiRules.push(`**AI Generation Rules:** ${brand.ai_prompt_rules}`);

      // LoRAs
      if (brand.default_loras && Array.isArray(brand.default_loras) && brand.default_loras.length > 0) {
        visual.push(`**Trained LoRA Models:** ${brand.default_loras.length} custom model(s) available for brand-consistent image generation`);
      }

      // Assemble brand context
      const hasProfile = profile.length > 0;
      const hasVoice = voice.length > 0;
      const hasVisual = visual.length > 0;

      if (hasProfile || hasVoice || hasVisual) {
        hasBrand = true;
        let brandContext = '\n## User\'s Brand (USE THIS — never ask them to re-describe their brand)\n';

        if (hasProfile) {
          brandContext += '\n### Brand Profile\n' + profile.join('\n') + '\n';
        }
        if (hasVoice) {
          brandContext += '\n### Brand Voice & Tone\n' + voice.join('\n') + '\n';
        }
        if (hasVisual) {
          brandContext += '\n### Visual Identity\n' + visual.join('\n') + '\n';
        }
        if (aiRules.length > 0) {
          brandContext += '\n### AI Generation Rules\n' + aiRules.join('\n') + '\n';
        }

        parts.push(brandContext);
      }
    }
  } catch { /* brand kit not available */ }

  // Visual subjects (trained characters)
  try {
    const { data: subjects } = await supabase
      .from('visual_subjects')
      .select('name, description')
      .eq('user_id', userId)
      .limit(5);

    if (subjects?.length > 0) {
      const subjectList = subjects.map(s => `- **${s.name}**${s.description ? `: ${s.description}` : ''}`).join('\n');
      parts.push(`\n### Trained Characters/Subjects\n${subjectList}`);
    }
  } catch { /* no subjects */ }

  if (!hasBrand) {
    parts.push(`\n## Brand Kit\nNo brand kit configured yet. Ask the user about their brand, target audience, and visual preferences to help tailor the campaign. Suggest they set up a Brand Kit in Stitch for future campaigns.`);
  }

  // === CAMPAIGN TEMPLATES ===
  parts.push(`\n## Campaign Templates (Offer these during Phase 1)
When the user has explained their goal, suggest relevant templates from this list. They can pick one, combine elements, or go custom.

**Brand Awareness (Top-of-Funnel)**
Goal: Educate and build trust with a new audience
Content mix: 3 LinkedIn thought-leadership posts + 2 educational carousels + 1 short-form video
Best for: New brands, entering new markets, establishing expertise

**Lead Generation**
Goal: Drive qualified leads to a landing page or sign-up
Content mix: 2 paid ad sets (Meta + LinkedIn) + 1 carousel (organic) + 2 LinkedIn posts (credibility)
Best for: B2B SaaS, services, high-consideration purchases

**Product Launch**
Goal: Build hype and drive first sales/sign-ups
Content mix: 1 teaser short video + 1 announcement carousel + 2 paid ad sets + 3 social posts
Best for: New product releases, feature launches, seasonal drops

**Social Proof & Authority**
Goal: Leverage testimonials, case studies, and behind-the-scenes
Content mix: 2 case study carousels + 2 testimonial-style posts + 1 behind-the-scenes short video
Best for: Building trust, overcoming objections, mid-funnel nurture

**Thought Leadership**
Goal: Position brand/founder as an industry authority
Content mix: 3 LinkedIn long-form posts + 2 educational carousels + 1 industry-take short video
Best for: B2B, professional services, founder-led brands

**Content Repurposing**
Goal: Maximize one topic across multiple formats and platforms
Content mix: 1 deep-dive storyboard + 1 short video (cut-down) + 1 carousel (key points) + 2 social posts (quotes/insights)
Best for: Efficient content creation, consistent messaging across platforms`);

  // === CONTENT TYPES ===
  parts.push(`\n## Content Types You Can Create
- **short**: Short-form video (15-60s) for YouTube Shorts, TikTok, Instagram Reels. Includes AI script, voiceover, keyframes, video clips, captions, music.
- **linkedin_post**: LinkedIn thought leadership post with branded image. Auto-generates copy and visual.
- **carousel**: Multi-slide carousel (3-10 slides) for LinkedIn or Instagram. Branded slides with text overlays.
- **ad_set**: Paid ad campaign with multiple creative variations for Meta (Facebook/Instagram) and LinkedIn. Includes headlines, descriptions, images.
- **storyboard**: Video storyboard with scenes, visual direction, and optional production. Good for longer or more complex video projects.
- **custom**: Anything that doesn't fit the above. Describe a custom flow and we'll build it.`);

  // === PLATFORM BEST PRACTICES ===
  parts.push(`\n## Platform Best Practices
- **YouTube Shorts**: 9:16, 15-60s, hook in first 2s, trending topics work well
- **TikTok**: 9:16, 15-60s, more casual/authentic tone, trending sounds help
- **LinkedIn**: Professional tone, 1:1 or 4:5 images, thought leadership and case studies perform best. Carousels get 3x engagement.
- **Instagram**: Visual-first, 1:1 or 4:5, carousels get 3x engagement of single images
- **Meta Ads**: Multiple variations recommended, test different hooks and CTAs. Facebook + Instagram placements.
- **LinkedIn Ads**: Professional imagery, clear value proposition, lead gen or traffic objectives
- **Google Ads**: Search + Display, headline-driven, keyword-targeted`);

  // === RECENT CAMPAIGNS ===
  try {
    const { data: campaigns } = await supabase
      .from('command_center_campaigns')
      .select('name, status, item_count, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (campaigns?.length > 0) {
      const list = campaigns.map(c =>
        `- "${c.name}" (${c.status}, ${c.item_count} items, ${new Date(c.created_at).toLocaleDateString()})`
      ).join('\n');
      parts.push(`\n## Recent Campaigns\n${list}\nReference these for context if the user mentions previous work.`);
    }
  } catch { /* no recent campaigns */ }

  // === JSON FORMAT (Phase 3 only) ===
  parts.push(`\n## Campaign JSON Format (Phase 3 ONLY)
ONLY output this JSON when the user explicitly tells you to build/proceed/create. Never during discovery or strategy discussion.

When outputting the plan, include a structured JSON block at the end wrapped in \`\`\`json markers:

\`\`\`json
{
  "name": "Campaign Name",
  "description": "Brief description of the campaign strategy",
  "items": [
    {
      "type": "short|linkedin_post|carousel|ad_set|storyboard|custom",
      "platform": "youtube|tiktok|linkedin|instagram|facebook|meta",
      "topic": "What this piece is about — be specific",
      "angle": "The creative angle, hook, or perspective",
      "tone": "upbeat|professional|casual|dramatic|educational",
      "duration": 30,
      "slide_count": 7,
      "visual_style": "cinematic|minimalist|bold|etc",
      "niche": "business|ai_tech_news|etc"
    }
  ]
}
\`\`\`

The JSON is parsed by the system automatically — the user won't see it. Keep your conversational message before the JSON block focused on confirming what you're building.`);

  return parts.join('\n');
}
