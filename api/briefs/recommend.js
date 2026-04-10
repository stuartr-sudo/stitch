/**
 * AI Workflow Recommendation Engine
 *
 * Analyzes a client brief and recommends which tools to use, in what order,
 * with estimated costs and reasoning.
 */

import OpenAI from 'openai';
import { getUserKeys } from '../lib/getUserKeys.js';

const TOOL_CATALOG = [
  { id: 'short', label: 'Shorts Workbench', cost: 1.93, description: 'AI-generated short video (30-90s) with voiceover, music, captions' },
  { id: 'carousel', label: 'Carousel Builder', cost: 0.38, description: 'Branded carousel post with AI backgrounds and text overlays' },
  { id: 'linkedin_post', label: 'LinkedIn Post', cost: 0.06, description: 'Professional LinkedIn post with branded image' },
  { id: 'ad_set', label: 'Ads Manager', cost: 0.12, description: 'Multi-platform ad campaign (LinkedIn, Google, Meta) with copy variations and images' },
  { id: 'storyboard', label: 'Storyboard', cost: 0.24, description: 'Video planning with scene breakdown, preview images, and production' },
  { id: 'longform', label: 'Longform Video', cost: 3.50, description: 'Chapter-based long video (2-10 minutes)' },
  { id: 'image_set', label: 'Imagineer Batch', cost: 0.15, description: 'Batch AI image generation with style consistency' },
  { id: 'command_center', label: 'Command Center', cost: 0, description: 'Orchestrate multiple content pieces from a single plan (use for 3+ deliverables)' },
];

export async function generateRecommendation(brief, userId, userEmail) {
  // Tier 1: Rule-based pre-filter
  const deliverables = brief.deliverables || [];
  const totalPieces = deliverables.reduce((sum, d) => sum + (d.quantity || 1), 0);

  // If 3+ deliverables, use Command Center for orchestration
  if (totalPieces >= 3) {
    return buildCommandCenterPlan(brief, deliverables);
  }

  // Tier 2: GPT refinement for smaller plans
  try {
    const keys = await getUserKeys(userId, userEmail);
    if (!keys?.openaiKey) {
      return buildRuleBasedPlan(brief, deliverables);
    }

    const openai = new OpenAI({ apiKey: keys.openaiKey });
    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are a content production planner for Stitch Studios, an AI video/content creation platform. Given a client brief, recommend which tools to use and in what order.

Available tools:
${TOOL_CATALOG.map(t => `- ${t.id}: ${t.label} (~$${t.cost}) — ${t.description}`).join('\n')}

Respond in JSON:
{
  "summary": "1-2 sentence plan overview",
  "phases": [
    { "order": 1, "tool": "tool_id", "label": "What this step does", "config": {}, "estimated_cost": 0.24, "reasoning": "Why this step is needed" }
  ],
  "total_estimated_cost": 2.61,
  "timeline_estimate": "2-3 hours"
}`
        },
        {
          role: 'user',
          content: JSON.stringify({
            goal: brief.goal,
            goal_description: brief.goal_description,
            platforms: brief.platforms,
            deliverables: brief.deliverables,
            audience: brief.audience_demographics,
            tone: brief.tone,
            budget: brief.budget_range
          })
        }
      ]
    });

    const plan = JSON.parse(response.choices[0].message.content);
    return plan;
  } catch (err) {
    console.error('[Recommend] GPT failed, falling back to rule-based:', err.message);
    return buildRuleBasedPlan(brief, deliverables);
  }
}

function buildCommandCenterPlan(brief, deliverables) {
  const items = deliverables.map(d => ({
    type: d.type,
    platform: d.platform || brief.platforms?.[0] || 'instagram',
    topic: brief.goal_description || brief.title,
    quantity: d.quantity || 1
  }));

  const totalCost = deliverables.reduce((sum, d) => {
    const tool = TOOL_CATALOG.find(t => t.id === d.type);
    return sum + (tool?.cost || 0.5) * (d.quantity || 1);
  }, 0);

  return {
    summary: `Multi-piece campaign with ${deliverables.length} content types. Using Command Center for orchestrated production.`,
    phases: [
      {
        order: 1,
        tool: 'command_center',
        label: 'Orchestrate all deliverables',
        config: { items },
        estimated_cost: totalCost,
        reasoning: `${deliverables.length} deliverable types = ${items.length} pieces. Command Center handles parallel production.`
      }
    ],
    total_estimated_cost: Math.round(totalCost * 100) / 100,
    timeline_estimate: items.length <= 3 ? '1-2 hours' : '2-4 hours'
  };
}

function buildRuleBasedPlan(brief, deliverables) {
  const phases = [];
  let totalCost = 0;
  let order = 0;

  for (const d of deliverables) {
    const tool = TOOL_CATALOG.find(t => t.id === d.type);
    if (!tool) continue;
    const qty = d.quantity || 1;
    const cost = tool.cost * qty;
    totalCost += cost;
    order++;
    phases.push({
      order,
      tool: d.type,
      label: `Create ${qty}x ${tool.label}${d.platform ? ` for ${d.platform}` : ''}`,
      config: { platform: d.platform, quantity: qty },
      estimated_cost: Math.round(cost * 100) / 100,
      reasoning: `Client requested ${qty} ${tool.label} deliverable(s)`
    });
  }

  return {
    summary: `${phases.length} content piece(s) to create. Sequential production recommended.`,
    phases,
    total_estimated_cost: Math.round(totalCost * 100) / 100,
    timeline_estimate: phases.length <= 2 ? '30-60 minutes' : '1-3 hours'
  };
}
