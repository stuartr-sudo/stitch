// Command Center — Chat Thread + Message CRUD
// Handles: create thread, list threads, get messages, delete thread

import { randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const userId = req.user.id;

  try {
    const threadId = req.params?.id;
    const sub = req.params?.sub; // 'messages' for /threads/:id/messages

    // POST /api/command-center/threads — create new thread
    if (req.method === 'POST' && !threadId) {
      const newThreadId = randomUUID();
      return res.json({ thread_id: newThreadId });
    }

    // GET /api/command-center/threads — list threads
    if (req.method === 'GET' && !threadId) {
      const limit = parseInt(req.query.limit) || 20;
      const offset = parseInt(req.query.offset) || 0;

      // Get distinct threads with their latest message
      const { data: messages, error } = await supabase
        .from('command_center_messages')
        .select('thread_id, content, role, campaign_id, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by thread, take latest message per thread
      const threadMap = new Map();
      for (const msg of (messages || [])) {
        if (!threadMap.has(msg.thread_id)) {
          threadMap.set(msg.thread_id, {
            thread_id: msg.thread_id,
            last_message: msg.content.substring(0, 100),
            last_role: msg.role,
            campaign_id: msg.campaign_id,
            last_activity: msg.created_at
          });
        }
      }

      const threads = [...threadMap.values()]
        .sort((a, b) => new Date(b.last_activity) - new Date(a.last_activity))
        .slice(offset, offset + limit);

      return res.json({ threads, total: threadMap.size });
    }

    // GET /api/command-center/threads/:id/messages — get messages for thread
    if (req.method === 'GET' && threadId && sub === 'messages') {
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;

      const { data: messages, error, count } = await supabase
        .from('command_center_messages')
        .select('*', { count: 'exact' })
        .eq('thread_id', threadId)
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return res.json({ messages: messages || [], total: count || 0 });
    }

    // DELETE /api/command-center/threads/:id — delete thread and messages
    if (req.method === 'DELETE' && threadId) {
      const { error } = await supabase
        .from('command_center_messages')
        .delete()
        .eq('thread_id', threadId)
        .eq('user_id', userId);

      if (error) throw error;
      return res.json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Command Center threads error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
