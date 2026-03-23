import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';

export default function StoryChat({ numScenes, mood, duration, onComplete }) {
  const [messages, setMessages] = useState([]); // { role, content }
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [showFinalize, setShowFinalize] = useState(false);
  const scrollRef = useRef(null);
  const initializedRef = useRef(false);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // On mount, send initial message to get AI's opening message
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const initChat = async () => {
      setSending(true);
      try {
        const starterMessages = [
          { role: 'user', content: 'Hi! I want to create a visual story. Help me get started.' },
        ];
        const res = await apiFetch('/api/storyboard/story-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: starterMessages,
            numScenes: numScenes || 4,
            mood: mood || '',
            duration: duration || 30,
          }),
        });
        const data = await res.json();
        if (data.success && data.reply) {
          setMessages([
            { role: 'assistant', content: data.reply },
          ]);
        }
      } catch (err) {
        setMessages([
          { role: 'assistant', content: 'Welcome! Tell me about the story you want to create. What\'s the first thing that happens?' },
        ]);
      } finally {
        setSending(false);
      }
    };

    initChat();
  }, [numScenes, mood, duration]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;

    const userMsg = { role: 'user', content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setSending(true);

    try {
      const res = await apiFetch('/api/storyboard/story-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages,
          numScenes: numScenes || 4,
          mood: mood || '',
          duration: duration || 30,
        }),
      });
      const data = await res.json();
      if (data.success && data.reply) {
        const assistantMsg = { role: 'assistant', content: data.reply };
        setMessages(prev => [...prev, assistantMsg]);

        // Show finalize button after a few exchanges
        const userCount = updatedMessages.filter(m => m.role === 'user').length;
        if (userCount >= 2) {
          setShowFinalize(true);
        }
      }
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' },
      ]);
    } finally {
      setSending(false);
    }
  }, [input, sending, messages, numScenes, mood, duration]);

  const handleFinalize = async () => {
    setFinalizing(true);
    try {
      const res = await apiFetch('/api/storyboard/story-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          numScenes: numScenes || 4,
          mood: mood || '',
          duration: duration || 30,
          finalize: true,
        }),
      });
      const data = await res.json();
      if (data.success && data.finalized) {
        onComplete({
          storyBeats: data.storyBeats,
          storyTitle: data.storyTitle,
          storyOverview: data.storyOverview,
          chatHistory: messages,
        });
      } else {
        throw new Error(data.error || 'Finalization failed');
      }
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `Failed to finalize story: ${err.message}. Please try again.` },
      ]);
    } finally {
      setFinalizing(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full min-h-[400px]">
      {/* Chat messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 p-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[#2C666E] text-white rounded-br-sm'
                  : 'bg-gray-100 text-gray-800 rounded-bl-sm'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-500 rounded-xl rounded-bl-sm px-4 py-2.5 text-sm flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Thinking...
            </div>
          </div>
        )}
      </div>

      {/* Finalize button */}
      {showFinalize && (
        <div className="px-4 pb-2">
          <Button
            onClick={handleFinalize}
            disabled={finalizing || sending}
            className="w-full bg-[#2C666E] hover:bg-[#2C666E]/90 text-white"
          >
            {finalizing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Extracting story beats...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Story looks good — continue
              </>
            )}
          </Button>
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-gray-200 p-3 flex gap-2">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe what happens next..."
          rows={1}
          className="flex-1 resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C666E]/30 focus:border-[#2C666E]"
        />
        <Button
          onClick={sendMessage}
          disabled={!input.trim() || sending}
          size="icon"
          className="bg-[#2C666E] hover:bg-[#2C666E]/90 text-white shrink-0"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
