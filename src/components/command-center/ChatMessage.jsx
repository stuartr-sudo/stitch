import React from 'react';
import { Bot, User } from 'lucide-react';

export function ChatMessage({ message }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs
        ${isUser ? 'bg-slate-600 text-slate-200' : 'bg-purple-600 text-white'}`}>
        {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
      </div>

      {/* Message bubble */}
      <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed
        ${isUser
          ? 'bg-slate-700 text-purple-200'
          : 'bg-slate-800/50 text-slate-200 border-l-2 border-purple-600'
        }`}>
        <div className="whitespace-pre-wrap break-words">{message.content}</div>
        {message.content === '' && message.role === 'assistant' && (
          <span className="inline-block w-2 h-4 bg-purple-500 rounded-sm animate-pulse" />
        )}
      </div>
    </div>
  );
}

export function StreamingIndicator() {
  return (
    <div className="flex gap-2">
      <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-purple-600 text-white text-xs">
        <Bot className="w-3.5 h-3.5" />
      </div>
      <div className="bg-slate-800/50 border-l-2 border-purple-600 rounded-xl px-3 py-2">
        <div className="flex gap-1">
          <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}
