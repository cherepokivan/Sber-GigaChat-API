import React, { useRef, useEffect } from 'react';
import { Send, CornerDownLeft } from 'lucide-react';

interface ComposerProps {
  input: string;
  setInput: (value: string) => void;
  onSend: () => void;
  isLoading: boolean;
  disabled?: boolean;
}

export const Composer: React.FC<ComposerProps> = ({
  input,
  setInput,
  onSend,
  isLoading,
  disabled = false,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea height
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    const nextHeight = Math.min(textarea.scrollHeight, 200);
    textarea.style.height = `${Math.max(48, nextHeight)}px`;
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && !disabled && input.trim()) {
        onSend();
      }
    }
  };

  const isSendDisabled = isLoading || disabled || !input.trim();

  return (
    <div className="w-full bg-[var(--bg-primary)] px-3 sm:px-6 pb-3 pt-2">
      <div className="max-w-3xl mx-auto">
        <div className="relative flex items-end gap-2 p-1.5 rounded-2xl bg-[var(--bg-panel)] border border-[var(--border-color)] focus-within:border-[var(--accent-color)] shadow-lg transition-all">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Напишите сообщение…"
            disabled={isLoading || disabled}
            className="w-full resize-none bg-transparent px-3 py-2.5 text-sm sm:text-base text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none max-h-48 leading-relaxed font-sans"
            aria-label="Текст сообщения"
          />

          <button
            type="button"
            onClick={onSend}
            disabled={isSendDisabled}
            className={`shrink-0 mb-0.5 p-2.5 rounded-xl transition-all flex items-center justify-center cursor-pointer ${
              isSendDisabled
                ? 'opacity-40 text-[var(--text-muted)] cursor-not-allowed bg-transparent'
                : 'bg-[var(--accent-color)] text-white hover:bg-[var(--accent-hover)] shadow-md active:scale-95'
            }`}
            aria-label="Отправить сообщение"
            title="Отправить (Enter)"
          >
            {isLoading ? (
              <div className="flex items-center gap-1 px-1 h-5 select-none" aria-hidden="true">
                <span className="w-1.5 h-1.5 rounded-full bg-current typing-dot-1" />
                <span className="w-1.5 h-1.5 rounded-full bg-current typing-dot-2" />
                <span className="w-1.5 h-1.5 rounded-full bg-current typing-dot-3" />
              </div>
            ) : (
              <Send size={18} />
            )}
          </button>
        </div>

        <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] px-2 pt-2 select-none">
          <div className="flex items-center gap-1">
            <span>Ответы генерируются GigaChat API</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5">
            <span>Shift + Enter — новая строка</span>
            <CornerDownLeft size={11} className="opacity-70" />
          </div>
        </div>
      </div>
    </div>
  );
};
