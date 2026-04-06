import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { apiFetch } from '@/lib/api';

const CommandCenterContext = createContext(null);

export function CommandCenterProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [threadId, setThreadId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const abortRef = useRef(null);

  const toggle = useCallback(() => {
    setIsOpen(prev => {
      if (!prev) setUnreadCount(0); // Clear unread when opening
      return !prev;
    });
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Create a new thread
  const startNewThread = useCallback(async () => {
    try {
      const res = await apiFetch('/api/command-center/threads', { method: 'POST' });
      const data = await res.json();
      setThreadId(data.thread_id);
      setMessages([]);
      return data.thread_id;
    } catch (err) {
      console.error('Failed to create thread:', err);
      return null;
    }
  }, []);

  // Load messages for a thread
  const loadThread = useCallback(async (tid) => {
    try {
      const res = await apiFetch(`/api/command-center/threads/${tid}/messages?limit=50`);
      const data = await res.json();
      setThreadId(tid);
      setMessages(data.messages || []);
    } catch (err) {
      console.error('Failed to load thread:', err);
    }
  }, []);

  // Add a message locally (optimistic)
  const addMessage = useCallback((role, content, metadata) => {
    const msg = {
      id: `local-${Date.now()}`,
      role,
      content,
      metadata_json: metadata || null,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, msg]);
    return msg;
  }, []);

  // Update the last assistant message (for streaming)
  const updateLastAssistant = useCallback((content) => {
    setMessages(prev => {
      const msgs = [...prev];
      for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].role === 'assistant') {
          msgs[i] = { ...msgs[i], content };
          break;
        }
      }
      return msgs;
    });
  }, []);

  // Cancel streaming
  const cancelStream = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const value = {
    isOpen,
    toggle,
    close,
    threadId,
    setThreadId,
    messages,
    setMessages,
    isStreaming,
    setIsStreaming,
    unreadCount,
    setUnreadCount,
    abortRef,
    startNewThread,
    loadThread,
    addMessage,
    updateLastAssistant,
    cancelStream
  };

  return (
    <CommandCenterContext.Provider value={value}>
      {children}
    </CommandCenterContext.Provider>
  );
}

// Safe fallback so components outside the provider don't crash
const NOOP = () => {};
const FALLBACK = {
  isOpen: false, toggle: NOOP, close: NOOP,
  threadId: null, setThreadId: NOOP,
  messages: [], setMessages: NOOP,
  isStreaming: false, setIsStreaming: NOOP,
  unreadCount: 0, setUnreadCount: NOOP,
  abortRef: { current: null },
  startNewThread: async () => null, loadThread: NOOP,
  addMessage: NOOP, updateLastAssistant: NOOP, cancelStream: NOOP
};

export function useCommandCenter() {
  const ctx = useContext(CommandCenterContext);
  return ctx || FALLBACK;
}
