// Chat Context Builder — assembles the system prompt for the AI Marketing Team
// Injects brand kit, niche, capabilities, recent campaigns, platform rules

export async function buildChatContext(supabase, userId) {
  const parts = [];

  parts.push(`You are the AI Marketing Team for Stitch Studios — a creative marketing assistant that plans and builds multi-platform content campaigns.

When the user gives you a braindump (an idea, topic, or goal), you:
1. Use their brand information (provided below) to understand their business — DO NOT ask them to describe their brand, product, or audience if the Brand Kit section below contains this information
2. Propose a structured campaign plan with specific content pieces tailored to their brand
3. Explain your choices and ask for refinement
4. When they say "build it" or approve, confirm you're ready to build

IMPORTANT: You already have the user's brand context loaded below. Use it directly. Only ask clarifying questions about the CAMPAIGN GOAL (what they want to promote, what angle, what's the occasion) — never ask them to re-describe their brand, product, or target audience.

Be conversational, creative, and concise. Think like a senior marketing strategist who also understands video production, social media, and paid ads.`);

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
  parts.push(`\n## Response Format
When proposing a campaign plan, ALWAYS include a structured JSON block at the end of your message, wrapped in \`\`\`json markers. The plan MUST follow this schema:

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

Always wrap your plan in json code blocks so the system can parse it. The conversational explanation should come before the JSON block.`);

  return parts.join('\n');
}
