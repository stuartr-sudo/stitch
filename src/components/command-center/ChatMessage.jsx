import React from 'react';
import { Bot, User } from 'lucide-react';

// Strip ```json ... ``` blocks from displayed content — system parses them, user shouldn't see them
function cleanContent(text) {
  if (!text) return '';
  return text.replace(/```json[\s\S]*?```/g, '').replace(/\n{3,}/g, '\n\n').trim();
}

// Lightweight markdown renderer — bold, italic, headers, lists
function renderMarkdown(text) {
  if (!text) return null;

  const lines = text.split('\n');
  const elements = [];
  let listItems = [];
  let listType = null; // 'ul' or 'ol'

  const flushList = () => {
    if (listItems.length > 0) {
      if (listType === 'ol') {
        elements.push(
          <ol key={`ol-${elements.length}`} className="list-decimal list-inside space-y-0.5 my-1">
            {listItems.map((li, i) => <li key={i} className="text-slate-200">{formatInline(li)}</li>)}
          </ol>
        );
      } else {
        elements.push(
          <ul key={`ul-${elements.length}`} className="space-y-0.5 my-1">
            {listItems.map((li, i) => (
              <li key={i} className="text-slate-200 flex items-start gap-1.5">
                <span className="text-teal-400 mt-1 text-[8px]">●</span>
                <span>{formatInline(li)}</span>
              </li>
            ))}
          </ul>
        );
      }
      listItems = [];
      listType = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Headers
    if (line.startsWith('### ')) {
      flushList();
      elements.push(
        <div key={i} className="text-slate-100 font-semibold text-xs mt-2 mb-0.5">
          {formatInline(line.slice(4))}
        </div>
      );
      continue;
    }
    if (line.startsWith('## ')) {
      flushList();
      elements.push(
        <div key={i} className="text-slate-100 font-bold text-sm mt-2.5 mb-0.5">
          {formatInline(line.slice(3))}
        </div>
      );
      continue;
    }

    // Bullet lists
    const bulletMatch = line.match(/^[\s]*[-•]\s+(.*)/);
    if (bulletMatch) {
      if (listType !== 'ul') flushList();
      listType = 'ul';
      listItems.push(bulletMatch[1]);
      continue;
    }

    // Numbered lists
    const numMatch = line.match(/^[\s]*(\d+)[.)]\s+(.*)/);
    if (numMatch) {
      if (listType !== 'ol') flushList();
      listType = 'ol';
      listItems.push(numMatch[2]);
      continue;
    }

    // Regular line
    flushList();
    if (line.trim() === '') {
      elements.push(<div key={i} className="h-1.5" />);
    } else {
      elements.push(
        <div key={i} className="text-slate-200">
          {formatInline(line)}
        </div>
      );
    }
  }

  flushList();
  return elements;
}

// Inline formatting: **bold**, _italic_, `code`
function formatInline(text) {
  if (!text) return text;

  const parts = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Bold: **text**
    const boldMatch = remaining.match(/^(.*?)\*\*(.+?)\*\*(.*)/s);
    if (boldMatch) {
      if (boldMatch[1]) parts.push(<span key={key++}>{boldMatch[1]}</span>);
      parts.push(<strong key={key++} className="text-white font-semibold">{boldMatch[2]}</strong>);
      remaining = boldMatch[3];
      continue;
    }

    // Italic: _text_
    const italicMatch = remaining.match(/^(.*?)_(.+?)_(.*)/s);
    if (italicMatch && !italicMatch[1].endsWith('_')) {
      if (italicMatch[1]) parts.push(<span key={key++}>{italicMatch[1]}</span>);
      parts.push(<em key={key++} className="text-slate-300 italic">{italicMatch[2]}</em>);
      remaining = italicMatch[3];
      continue;
    }

    // Inline code: `text`
    const codeMatch = remaining.match(/^(.*?)`(.+?)`(.*)/s);
    if (codeMatch) {
      if (codeMatch[1]) parts.push(<span key={key++}>{codeMatch[1]}</span>);
      parts.push(<code key={key++} className="bg-slate-700/50 text-teal-300 px-1 py-0.5 rounded text-[11px]">{codeMatch[2]}</code>);
      remaining = codeMatch[3];
      continue;
    }

    // No more matches
    parts.push(<span key={key++}>{remaining}</span>);
    break;
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

export function ChatMessage({ message }) {
  const isUser = message.role === 'user';
  const displayContent = isUser ? message.content : cleanContent(message.content);

  return (
    <div className={`flex gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs
        ${isUser ? 'bg-slate-600 text-slate-200' : 'bg-teal-700 text-white'}`}>
        {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
      </div>

      {/* Message bubble */}
      <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed
        ${isUser
          ? 'bg-slate-700 text-slate-200'
          : 'bg-slate-800/50 text-slate-200 border-l-2 border-teal-600'
        }`}>
        {isUser ? (
          <div className="whitespace-pre-wrap break-words">{displayContent}</div>
        ) : (
          <div className="break-words">{renderMarkdown(displayContent)}</div>
        )}
        {message.content === '' && message.role === 'assistant' && (
          <span className="inline-block w-2 h-4 bg-teal-500 rounded-sm animate-pulse" />
        )}
      </div>
    </div>
  );
}

export function StreamingIndicator() {
  return (
    <div className="flex gap-2">
      <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-teal-700 text-white text-xs">
        <Bot className="w-3.5 h-3.5" />
      </div>
      <div className="bg-slate-800/50 border-l-2 border-teal-600 rounded-xl px-3 py-2">
        <div className="flex gap-1">
          <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}
