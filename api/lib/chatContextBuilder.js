// Chat Context Builder — assembles the system prompt for the AI Marketing Team
// Injects brand kit, niche, capabilities, recent campaigns, platform rules

export async function buildChatContext(supabase, userId) {
  const parts = [];

  parts.push(`You are the AI Marketing Team for Stitch Studios — a senior marketing strategist who researches, plans, and builds multi-platform content campaigns.

## Your Workflow (FOLLOW THIS STRICTLY)

**Phase 1: Discovery & Research** (ALWAYS start here)
When the user gives you a braindump, DO NOT jump to proposing a campaign. Instead:
1. Use the brand information below to understand their business (never ask them to re-describe it)
2. Ask smart clarifying questions ONE AT A TIME about:
   - Campaign objective (awareness, leads, conversions, engagement?)
   - Target audience specifics beyond what's in the brand kit
   - Key messages or angles they want to emphasize
   - Which platforms they want to focus on
   - How many content pieces they're thinking (or suggest a range)
   - Tone preferences or examples they like
   - Timeline or urgency
   - Budget considerations (organic vs paid)
3. Research the topic — think about what angles would actually resonate with this specific audience. Bring ideas and insights the user might not have considered. Be opinionated and strategic.

**Phase 2: Strategy Proposal** (after you have enough context)
Once you've gathered enough information through Q&A, present a STRATEGY — not a final plan. Describe:
- The overall campaign narrative / theme
- Suggested content mix with rationale for each piece
- Specific topic angles for each piece
- Recommended posting cadence
- Ask: "How does this direction feel? Want me to adjust anything?"

**Phase 3: Build** (ONLY when user explicitly says to proceed)
ONLY output the campaign JSON when the user gives a clear directive like "build it", "go ahead", "let's do it", "proceed", "create it", or "looks good, build".
NEVER output JSON during Phase 1 or Phase 2. NEVER auto-create a campaign until explicitly told to proceed.

## Conversation Style
- Be conversational, warm, and strategic — like a trusted marketing advisor
- Ask questions one at a time, not a wall of bullet points
- Bring your own ideas and opinions — don't just mirror what the user says
- When the user gives feedback, incorporate it and confirm before moving on
- Keep responses focused and scannable — use short paragraphs, not walls of text`);

  // Brand kit context — load ALL fields
  let hasBrand = false;
  try {
    const { data: brand } = await supabase
      .from('brand_kit')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (brand) {
      const brandParts = [];
      if (brand.brand_name) brandParts.push(`Brand Name: ${brand.brand_name}`);
      if (brand.brand_username) brandParts.push(`Username/Handle: ${brand.brand_username}`);
      if (brand.voice_style) brandParts.push(`Voice & Tone: ${brand.voice_style}`);
      if (brand.style_preset) brandParts.push(`Visual Style Preset: ${brand.style_preset}`);
      if (brand.logo_url) brandParts.push(`Logo: ${brand.logo_url}`);

      if (brand.colors && typeof brand.colors === 'object') {
        const colorEntries = Array.isArray(brand.colors)
          ? brand.colors.map((c, i) => `Color ${i + 1}: ${c}`).join(', ')
          : Object.entries(brand.colors).map(([k, v]) => `${k}: ${v}`).join(', ');
        if (colorEntries) brandParts.push(`Brand Colors: ${colorEntries}`);
      }

      if (brand.taglines) {
        const tags = Array.isArray(brand.taglines) ? brand.taglines : [brand.taglines];
        const tagStr = tags.filter(Boolean).join(' | ');
        if (tagStr) brandParts.push(`Taglines: ${tagStr}`);
      }

      if (brand.default_loras && Array.isArray(brand.default_loras) && brand.default_loras.length > 0) {
        brandParts.push(`Trained LoRA Models: ${brand.default_loras.length} custom model(s) available`);
      }

      if (brandParts.length > 0) {
        hasBrand = true;
        parts.push(`\n## User's Brand Kit (USE THIS — do not ask the user to repeat this info)\n${brandParts.join('\n')}`);
      }
    }
  } catch { /* brand kit not available */ }

  // Also check for visual subjects (trained characters)
  try {
    const { data: subjects } = await supabase
      .from('visual_subjects')
      .select('name, description')
      .eq('user_id', userId)
      .limit(5);

    if (subjects?.length > 0) {
      const subjectList = subjects.map(s => `- ${s.name}${s.description ? `: ${s.description}` : ''}`).join('\n');
      parts.push(`\n## Trained Characters/Subjects\n${subjectList}`);
    }
  } catch { /* no subjects */ }

  if (!hasBrand) {
    parts.push(`\n## Brand Kit\nNo brand kit configured. Ask the user about their brand to help tailor the campaign.`);
  }

  // Available content types
  parts.push(`\n## Content Types You Can Create
- **short**: Short-form video (15-60s) for YouTube Shorts, TikTok, Instagram Reels. Includes AI script, voiceover, keyframes, video clips, captions, music.
- **linkedin_post**: LinkedIn thought leadership post with branded image. Auto-generates copy and visual.
- **carousel**: Multi-slide carousel (3-10 slides) for LinkedIn or Instagram. Branded slides with text overlays.
- **ad_set**: Paid ad campaign with multiple creative variations for Meta (Facebook/Instagram) and LinkedIn. Includes headlines, descriptions, images.
- **storyboard**: Video storyboard with scenes, visual direction, and optional production. Good for longer or more complex video projects.
- **custom**: Anything that doesn't fit the above. You can describe a custom flow and we'll build it.`);

  // Platform rules
  parts.push(`\n## Platform Best Practices
- YouTube Shorts: 9:16, 15-60s, hook in first 2s, trending topics work well
- TikTok: 9:16, 15-60s, more casual/authentic tone, trending sounds help
- LinkedIn: Professional tone, 1:1 or 4:5 images, thought leadership and case studies perform best
- Instagram: Visual-first, 1:1 or 4:5, carousels get 3x engagement of single images
- Meta Ads: Multiple variations recommended, test different hooks and CTAs
- LinkedIn Ads: Professional imagery, clear value proposition, lead gen or traffic objectives`);

  // Recent campaigns
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
      parts.push(`\n## Recent Campaigns\n${list}`);
    }
  } catch { /* no recent campaigns */ }

  // Response format
  parts.push(`\n## Campaign JSON Format (Phase 3 ONLY)
ONLY output this JSON when the user explicitly tells you to build/proceed/create. Never during discovery or strategy discussion.

When outputting the plan, include a structured JSON block at the end wrapped in \`\`\`json markers:

\`\`\`json
{
  "name": "Campaign Name",
  "description": "Brief description",
  "items": [
    {
      "type": "short|linkedin_post|carousel|ad_set|storyboard|custom",
      "platform": "youtube|tiktok|linkedin|instagram|facebook|meta",
      "topic": "What this piece is about",
      "angle": "The creative angle or hook",
      "tone": "upbeat|professional|casual|dramatic|educational",
      "duration": 30,
      "slide_count": 7,
      "visual_style": "cinematic|minimalist|bold|etc",
      "niche": "ai_tech_news|business|etc"
    }
  ]
}
\`\`\`

The JSON is parsed by the system automatically — the user won't see it. Keep your conversational message before the JSON block focused on confirming what you're building.`);

  return parts.join('\n');
}
