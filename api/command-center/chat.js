// Command Center — SSE Streaming Chat Endpoint
// POST /api/command-center/chat
// Streams AI responses token-by-token via Server-Sent Events

import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { buildChatContext } from '../lib/chatContextBuilder.js';
import { getUserKeys } from '../lib/getUserKeys.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const userId = req.user.id;
  const userEmail = req.user.email;
  const { thread_id, message } = req.body;

  if (!thread_id || !message?.trim()) {
    return res.status(400).json({ error: 'thread_id and message are required' });
  }

  // Set up SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no' // Disable nginx buffering if behind proxy
  });

  // Keepalive interval
  const keepalive = setInterval(() => {
    try { res.write('data: {"type":"ping"}\n\n'); } catch { /* connection closed */ }
  }, 30000);

  const sendEvent = (data) => {
    try { res.write(`data: ${JSON.stringify(data)}\n\n`); } catch { /* connection closed */ }
  };

  try {
    // Resolve API keys
    const keys = await getUserKeys(userId, userEmail);
    if (!keys.openaiKey) {
      sendEvent({ type: 'error', message: 'OpenAI API key not configured' });
      res.end();
      clearInterval(keepalive);
      return;
    }

    const openai = new OpenAI({ apiKey: keys.openaiKey });

    // Save user message to DB
    await supabase.from('command_center_messages').insert({
      user_id: userId,
      thread_id,
      role: 'user',
      content: message.trim()
    });

    // Build system prompt with brand/campaign context
    const systemPrompt = await buildChatContext(supabase, userId);

    // Load conversation history (last 20 messages)
    const { data: history } = await supabase
      .from('command_center_messages')
      .select('role, content')
      .eq('thread_id', thread_id)
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(20);

    // Build messages array for OpenAI
    const openaiMessages = [
      { role: 'system', content: systemPrompt },
      ...(history || []).map(m => ({ role: m.role, content: m.content }))
    ];

    // Stream response
    const stream = await openai.chat.completions.create({
      model: 'gpt-5-mini',
      messages: openaiMessages,
      stream: true,
      temperature: 0.8,
      max_tokens: 2000
    });

    let fullResponse = '';
    let planJson = null;

    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content;
      if (delta) {
        fullResponse += delta;
        sendEvent({ type: 'token', content: delta });

        // Try to detect a JSON plan block in the accumulated response
        if (!planJson && fullResponse.includes('```json')) {
          const jsonMatch = fullResponse.match(/```json\s*([\s\S]*?)```/);
          if (jsonMatch) {
            try {
              planJson = JSON.parse(jsonMatch[1].trim());
              sendEvent({ type: 'plan', plan: planJson });
            } catch { /* incomplete JSON, will retry on next chunk */ }
          }
        }
      }

      if (chunk.choices?.[0]?.finish_reason) break;
    }

    // Save assistant response to DB
    await supabase.from('command_center_messages').insert({
      user_id: userId,
      thread_id,
      role: 'assistant',
      content: fullResponse,
      metadata_json: planJson ? { plan: planJson } : null
    });

    // If a plan was detected, also save it as a campaign in planning status
    if (planJson?.name && planJson?.items?.length > 0) {
      const { data: campaign } = await supabase
        .from('command_center_campaigns')
        .insert({
          user_id: userId,
          name: planJson.name,
          description: planJson.description || null,
          plan_json: planJson,
          braindump_text: message.trim(),
          status: 'planning',
          item_count: planJson.items.length
        })
        .select()
        .single();

      if (campaign) {
        // Send campaign ID back so frontend can trigger build
        sendEvent({ type: 'plan', plan: { ...planJson, _campaign_id: campaign.id } });
        sendEvent({ type: 'status', message: `Campaign "${planJson.name}" saved as draft` });

        // Update the message with the campaign link
        await supabase.from('command_center_messages')
          .update({ campaign_id: campaign.id })
          .eq('user_id', userId)
          .eq('thread_id', thread_id)
          .eq('role', 'assistant')
          .order('created_at', { ascending: false })
          .limit(1);
      }
    }

    sendEvent({ type: 'complete' });
  } catch (err) {
    console.error('Command Center chat error:', err);
    sendEvent({ type: 'error', message: err.message || 'Chat failed' });
  } finally {
    clearInterval(keepalive);
    res.end();
  }
}
