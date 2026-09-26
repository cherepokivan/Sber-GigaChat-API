import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { User, Bot, Copy, Check, RotateCcw } from 'lucide-react';
import { MessageItem } from '../lib/storage';

interface MessageProps {
  message: MessageItem;
  isLastAssistant?: boolean;
  onRetry?: () => void;
  isGenerating?: boolean;
}

export const Message: React.FC<MessageProps> = ({
  message,
  isLastAssistant = false,
  onRetry,
  isGenerating = false,
}) => {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const handleCopy = async () => {
    if (!message.content) return;
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = message.content;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formattedTime = new Date(message.time).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className={`group relative w-full py-4 px-3 sm:px-6 transition-colors ${
        isUser
          ? 'bg-[var(--user-msg-bg)]/40'
          : 'bg-[var(--bot-msg-bg)]'
      }`}
    >
      <div className="max-w-3xl mx-auto flex gap-3.5 sm:gap-4 items-start">
        {/* Avatar */}
        <div
          className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold select-none shadow-sm ${
            isUser
              ? 'bg-[var(--accent-color)] text-white'
              : 'bg-[var(--bg-panel-secondary)] border border-[var(--border-color)] text-[var(--accent-color)]'
          }`}
          aria-hidden="true"
        >
          {isUser ? <User size={16} /> : <Bot size={16} />}
        </div>

        {/* Content area */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-medium text-[var(--text-primary)]">
              {isUser ? 'Вы' : 'GigaChat'}
            </span>
            {message.model && !isUser && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-panel-secondary)] border border-[var(--border-color)] text-[var(--text-secondary)]">
                {message.model}
              </span>
            )}
            <span className="text-[11px] text-[var(--text-muted)] ml-auto sm:ml-2">
              {formattedTime}
            </span>
          </div>

          <div className="prose-gchat">
            {isUser ? (
              <div className="whitespace-pre-wrap">{message.content}</div>
            ) : (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  pre({ children }) {
                    return (
                      <div className="relative my-3 rounded-lg overflow-hidden border border-[var(--border-color)] bg-[var(--code-bg)]">
                        <pre className="p-3.5 overflow-x-auto text-[13px] font-mono text-[var(--text-primary)] leading-relaxed">
                          {children}
                        </pre>
                      </div>
                    );
                  },
                  code({ className, children, ...props }) {
                    const isInline = !className && !String(children).includes('\n');
                    if (isInline) {
                      return <code {...props}>{children}</code>;
                    }
                    return (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            )}
          </div>

          {/* Assistant Action Buttons */}
          {!isUser && !isGenerating && message.content && (
            <div className="flex items-center gap-2 mt-3 pt-1 text-xs">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border border-transparent hover:border-[var(--border-color)] transition-all cursor-pointer"
                title={copied ? 'Скопировано в буфер' : 'Копировать сообщение'}
                aria-label={copied ? 'Скопировано в буфер' : 'Копировать сообщение'}
              >
                {copied ? (
                  <>
                    <Check size={13} className="text-[var(--success-color)]" />
                    <span className="text-[var(--success-color)]">Скопировано</span>
                  </>
                ) : (
                  <>
                    <Copy size={13} />
                    <span>Копировать</span>
                  </>
                )}
              </button>

              {isLastAssistant && onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border border-transparent hover:border-[var(--border-color)] transition-all cursor-pointer"
                  title="Повторить последний запрос"
                  aria-label="Повторить последний запрос"
                >
                  <RotateCcw size={13} />
                  <span>Повторить</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
