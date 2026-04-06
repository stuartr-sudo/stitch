import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, X, Send, Plus, Loader2, Square, History, MessageSquare } from 'lucide-react';
import { useCommandCenter } from '@/contexts/CommandCenterContext';
import { useSSEChat } from '@/hooks/useSSEChat';
import { apiFetch } from '@/lib/api';
import { ChatMessage, StreamingIndicator } from './ChatMessage';
import { PlanCard } from './PlanCard';

export default function ChatBubble() {
  const {
    isOpen, toggle, close,
    threadId, messages, isStreaming, setIsStreaming,
    unreadCount,
    startNewThread, loadThread, addMessage, updateLastAssistant, cancelStream,
    pendingContext, setPendingContext
  } = useCommandCenter();

  const { sendMessage, cancel } = useSSEChat();
  const [input, setInput] = useState('');
  const [currentPlan, setCurrentPlan] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [threads, setThreads] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Load thread history
  const fetchThreads = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await apiFetch('/api/command-center/threads?limit=10');
      const data = await res.json();
      setThreads(data.threads || []);
    } catch { /* ignore */ }
    setLoadingHistory(false);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Ensure thread exists
  useEffect(() => {
    if (isOpen && !threadId) {
      startNewThread();
    }
  }, [isOpen, threadId, startNewThread]);

  // Auto-send pending context (from Ad Intelligence "Use in Command Center")
  const pendingContextHandled = useRef(false);
  useEffect(() => {
    if (pendingContext && threadId && !isStreaming && !pendingContextHandled.current) {
      pendingContextHandled.current = true;
      setInput(pendingContext);
      setPendingContext(null);
      // Trigger send after a brief delay so the input is visible
      setTimeout(() => {
        pendingContextHandled.current = false;
      }, 300);
    }
  }, [pendingContext, threadId, isStreaming, setPendingContext]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    let tid = threadId;
    if (!tid) {
      tid = await startNewThread();
      if (!tid) return;
    }

    setInput('');
    addMessage('user', text);
    addMessage('assistant', ''); // Placeholder for streaming
    setIsStreaming(true);
    setCurrentPlan(null);

    let accumulated = '';

    await sendMessage({
      threadId: tid,
      message: text,
      onToken: (token) => {
        accumulated += token;
        updateLastAssistant(accumulated);
      },
      onPlan: (plan) => {
        setCurrentPlan(plan);
      },
      onStatus: (msg) => {
        // Transient status (e.g. "Researching...") — show briefly, don't permanently append
        if (msg === 'Researching...') {
          updateLastAssistant(accumulated || `_${msg}_`);
        } else {
          accumulated += `\n\n_${msg}_`;
          updateLastAssistant(accumulated);
        }
      },
      onComplete: () => {
        setIsStreaming(false);
      },
      onError: (err) => {
        if (!accumulated) {
          updateLastAssistant(`Something went wrong: ${err}`);
        } else {
          accumulated += `\n\n_Error: ${err}_`;
          updateLastAssistant(accumulated);
        }
        setIsStreaming(false);
      }
    });
  }, [input, isStreaming, threadId, startNewThread, addMessage, updateLastAssistant, setIsStreaming, sendMessage]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewChat = async () => {
    cancelStream();
    cancel();
    setCurrentPlan(null);
    await startNewThread();
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape' && isOpen) close();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, close]);

  return (
    <>
      {/* Floating bubble */}
      <button
        onClick={toggle}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center
          bg-[#2C666E] text-white shadow-lg shadow-teal-800/30
          hover:bg-[#3a7a83] hover:shadow-teal-800/50 hover:scale-105 transition-all duration-200
          ${isOpen ? 'scale-0 opacity-0 pointer-events-none' : 'scale-100 opacity-100'}`}
        aria-label="Open AI Marketing Team"
      >
        <Bot className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Chat panel overlay */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] max-h-[600px] bg-slate-800 border border-slate-700/50 rounded-2xl shadow-2xl shadow-black/40 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#2C666E] flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="text-teal-300 font-semibold text-sm">Marketing Team</div>
                <div className="text-slate-500 text-[10px]">
                  {isStreaming ? 'Thinking...' : 'Ready to help'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => { setShowHistory(!showHistory); if (!showHistory) fetchThreads(); }}
                className={`p-1.5 rounded-lg hover:bg-slate-700/50 transition-colors ${showHistory ? 'text-teal-400' : 'text-slate-400 hover:text-slate-200'}`}
                title="Chat history"
              >
                <History className="w-4 h-4" />
              </button>
              <button
                onClick={handleNewChat}
                className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 transition-colors"
                title="New braindump"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={close}
                className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Thread history dropdown */}
          {showHistory && (
            <div className="border-b border-slate-700/50 px-3 py-2 max-h-[200px] overflow-y-auto">
              {loadingHistory ? (
                <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-slate-500" /></div>
              ) : threads.length === 0 ? (
                <p className="text-slate-500 text-xs text-center py-3">No previous conversations</p>
              ) : (
                <div className="space-y-1">
                  {threads.map(t => (
                    <button
                      key={t.thread_id}
                      onClick={() => { loadThread(t.thread_id); setShowHistory(false); }}
                      className={`w-full text-left px-2 py-1.5 rounded-lg text-xs transition-colors
                        ${t.thread_id === threadId ? 'bg-teal-900/30 text-teal-300' : 'hover:bg-slate-700/50 text-slate-400'}`}
                    >
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{t.last_message || 'Empty conversation'}</span>
                      </div>
                      <span className="text-[10px] text-slate-600 ml-5">
                        {new Date(t.last_activity).toLocaleDateString()}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0" style={{ maxHeight: '440px' }}>
            {messages.length === 0 && !isStreaming && (
              <div className="text-center py-8">
                <Bot className="w-10 h-10 text-teal-600/40 mx-auto mb-3" />
                <p className="text-slate-400 text-sm font-medium">What are we creating today?</p>
                <p className="text-slate-600 text-xs mt-1">Braindump your ideas — I'll plan the campaign.</p>
              </div>
            )}

            {messages.map((msg, i) => (
              <ChatMessage key={msg.id || i} message={msg} />
            ))}

            {currentPlan && (
              <PlanCard
                plan={currentPlan}
                onBuild={async () => {
                  addMessage('user', 'Build it!');
                  // Find the campaign ID from the last assistant message metadata
                  const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
                  const campaignId = lastAssistant?.metadata_json?.campaign_id || currentPlan?._campaign_id;

                  if (!campaignId) {
                    // If no campaign ID yet, send "build it" through chat so the AI can handle it
                    const text = 'Build it!';
                    let tid = threadId;
                    if (!tid) tid = await startNewThread();
                    addMessage('assistant', '');
                    setIsStreaming(true);
                    let acc = '';
                    await sendMessage({
                      threadId: tid,
                      message: text,
                      onToken: (t) => { acc += t; updateLastAssistant(acc); },
                      onComplete: () => setIsStreaming(false),
                      onError: (e) => { updateLastAssistant(acc + '\n\nError: ' + e); setIsStreaming(false); }
                    });
                    return;
                  }

                  // Trigger build
                  addMessage('assistant', 'Starting build...');
                  try {
                    const res = await apiFetch(`/api/command-center/campaigns/${campaignId}/build`, { method: 'POST' });
                    const data = await res.json();
                    if (data.error) {
                      updateLastAssistant(`Build failed: ${data.error}`);
                    } else {
                      updateLastAssistant(`Building ${data.estimate?.breakdown?.length || 0} items (est. ${data.estimate?.formatted || '$0'}). Check the Command Center for progress!`);
                    }
                  } catch (err) {
                    updateLastAssistant(`Build failed: ${err.message}`);
                  }
                  setCurrentPlan(null);
                }}
              />
            )}

            {isStreaming && messages[messages.length - 1]?.content === '' && (
              <StreamingIndicator />
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-slate-700/50">
            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your braindump..."
                rows={1}
                className="flex-1 bg-slate-800/60 border border-slate-700/50 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-500 resize-none focus:outline-none focus:border-teal-600/50 focus:ring-1 focus:ring-teal-600/20"
                style={{ maxHeight: '100px' }}
                onInput={(e) => {
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
                }}
              />
              {isStreaming ? (
                <button
                  onClick={() => { cancelStream(); cancel(); setIsStreaming(false); }}
                  className="flex-shrink-0 w-10 h-10 rounded-xl bg-red-600 hover:bg-red-500 text-white flex items-center justify-center transition-colors"
                  title="Stop"
                >
                  <Square className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#2C666E] hover:bg-[#3a7a83] disabled:bg-slate-700 disabled:text-slate-500 text-white flex items-center justify-center transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
