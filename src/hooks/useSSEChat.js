import { useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Hook for SSE streaming chat with the Command Center AI.
 * Uses fetch + ReadableStream (not EventSource) to support POST + auth headers.
 */
export function useSSEChat() {
  const abortRef = useRef(null);

  const sendMessage = useCallback(async ({
    threadId,
    message,
    onToken,
    onPlan,
    onStatus,
    onComplete,
    onError
  }) => {
    // Cancel any existing stream
    if (abortRef.current) {
      abortRef.current.abort();
    }

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        onError?.('Not authenticated');
        return;
      }

      const res = await fetch('/api/command-center/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ thread_id: threadId, message }),
        signal: controller.signal
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Stream failed' }));
        onError?.(err.error || `HTTP ${res.status}`);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE lines
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (!raw || raw === '[DONE]') continue;

          try {
            const event = JSON.parse(raw);

            switch (event.type) {
              case 'token':
                onToken?.(event.content);
                break;
              case 'plan':
                onPlan?.(event.plan);
                break;
              case 'status':
                onStatus?.(event.message);
                break;
              case 'complete':
                onComplete?.(event);
                break;
              case 'error':
                onError?.(event.message);
                break;
              case 'ping':
                // Keepalive — ignore
                break;
            }
          } catch {
            // Skip malformed JSON lines
          }
        }
      }

      // If we get here naturally (stream ended), signal complete
      onComplete?.({});
    } catch (err) {
      if (err.name === 'AbortError') return; // User cancelled
      onError?.(err.message);
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
    }
  }, []);

  const cancel = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  return { sendMessage, cancel };
}
