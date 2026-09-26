import React, { useRef, useEffect, useState } from 'react';
import { Sparkles, AlertCircle, ArrowDown, HelpCircle, Code, Lightbulb, GraduationCap, X } from 'lucide-react';
import { Message } from './Message';
import { Composer } from './Composer';
import { ChatSession } from '../lib/storage';

interface ChatViewProps {
  chat: ChatSession | null;
  input: string;
  setInput: (value: string) => void;
  onSendMessage: (overrideContent?: string) => void;
  isLoading: boolean;
  errorMessage: string | null;
  onDismissError: () => void;
  onRetry: () => void;
  hasToken: boolean;
  onOpenSettings: () => void;
}

const SUGGESTIONS = [
  {
    icon: HelpCircle,
    label: 'Объясни тему',
    text: 'Объясни сложную тему простыми словами: как работают квантовые компьютеры?',
  },
  {
    icon: Code,
    label: 'Напиши код',
    text: 'Помоги написать код: функция debounce на TypeScript с подробным объяснением.',
  },
  {
    icon: Lightbulb,
    label: 'Идея проекта',
    text: 'Придумай идею для проекта с открытым исходным кодом в области AI.',
  },
  {
    icon: GraduationCap,
    label: 'План обучения',
    text: 'Составь план обучения современному веб-разработчику на 3 месяца.',
  },
];

export const ChatView: React.FC<ChatViewProps> = ({
  chat,
  input,
  setInput,
  onSendMessage,
  isLoading,
  errorMessage,
  onDismissError,
  onRetry,
  hasToken,
  onOpenSettings,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const isUserScrolledUp = useRef(false);

  // Auto-scroll handler
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior,
      });
      isUserScrolledUp.current = false;
      setShowScrollBottom(false);
    }
  };

  // Detect manual scroll
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const distanceToBottom = scrollHeight - (scrollTop + clientHeight);

    if (distanceToBottom > 120) {
      isUserScrolledUp.current = true;
      setShowScrollBottom(true);
    } else {
      isUserScrolledUp.current = false;
      setShowScrollBottom(false);
    }
  };

  // Scroll down on new messages only if user hasn't scrolled up
  useEffect(() => {
    if (!isUserScrolledUp.current) {
      scrollToBottom('smooth');
    }
  }, [chat?.messages, isLoading]);

  const messages = chat?.messages || [];
  const isEmpty = messages.length === 0;

  const handleSuggestionClick = (text: string) => {
    setInput(text);
  };

  return (
    <div className="relative flex-1 flex flex-col h-full min-w-0 bg-[var(--bg-primary)] overflow-hidden">
      {/* Scrollable messages container */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overscroll-contain"
      >
        {isEmpty ? (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center max-w-2xl mx-auto select-none">
            <div className="w-14 h-14 rounded-2xl bg-[var(--bg-panel-secondary)] border border-[var(--border-color)] flex items-center justify-center text-[var(--accent-color)] shadow-md mb-5">
              <Sparkles size={28} />
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] mb-2 tracking-tight">
              Чем могу помочь?
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mb-8 max-w-md">
              Общайтесь с GigaChat напрямую через официальный API.
            </p>

            {!hasToken && (
              <div className="mb-6 p-4 rounded-xl bg-[var(--warning-bg)] border border-[var(--warning-color)]/30 text-left max-w-md w-full">
                <div className="flex items-start gap-3">
                  <AlertCircle size={18} className="text-[var(--warning-color)] shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-semibold text-[var(--text-primary)] mb-1">
                      Access Token не задан
                    </p>
                    <p className="text-[var(--text-secondary)] mb-2.5">
                      Для отправки запросов вставьте ваш временный Access Token от GigaChat.
                    </p>
                    <button
                      type="button"
                      onClick={onOpenSettings}
                      className="px-3 py-1.5 rounded-lg bg-[var(--accent-color)] text-white text-xs font-medium hover:bg-[var(--accent-hover)] cursor-pointer transition-colors shadow-sm"
                    >
                      Подключить GigaChat
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Suggestions Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
              {SUGGESTIONS.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSuggestionClick(item.text)}
                    className="p-3.5 rounded-xl text-left bg-[var(--bg-panel)] border border-[var(--border-color)] hover:border-[var(--accent-color)]/50 hover:bg-[var(--bg-hover)] transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div className="flex items-center gap-2 mb-1.5 text-xs font-medium text-[var(--accent-color)]">
                      <Icon size={14} className="group-hover:scale-110 transition-transform" />
                      <span>{item.label}</span>
                    </div>
                    <span className="text-xs text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] line-clamp-2 transition-colors">
                      {item.text}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="py-4 divide-y divide-[var(--border-color)]/40">
            {messages.map((msg, index) => {
              const isLastAssistant =
                msg.role === 'assistant' && index === messages.length - 1;
              return (
                <Message
                  key={msg.id || index}
                  message={msg}
                  isLastAssistant={isLastAssistant}
                  onRetry={onRetry}
                  isGenerating={isLoading && isLastAssistant}
                />
              );
            })}

            {/* Temporary typing indicator while awaiting the very first token */}
            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="w-full py-4 px-3 sm:px-6 bg-[var(--bot-msg-bg)]">
                <div className="max-w-3xl mx-auto flex gap-4 items-center">
                  <div className="w-8 h-8 rounded-lg bg-[var(--bg-panel-secondary)] border border-[var(--border-color)] flex items-center justify-center text-[var(--accent-color)]">
                    <Sparkles size={16} />
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--bg-panel-secondary)] border border-[var(--border-color)] text-[var(--accent-color)]">
                    <span className="w-2 h-2 rounded-full bg-current typing-dot-1" />
                    <span className="w-2 h-2 rounded-full bg-current typing-dot-2" />
                    <span className="w-2 h-2 rounded-full bg-current typing-dot-3" />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating scroll to bottom button */}
      {showScrollBottom && (
        <button
          type="button"
          onClick={() => scrollToBottom('smooth')}
          className="absolute bottom-24 right-6 p-2 rounded-full bg-[var(--bg-panel)] border border-[var(--border-color)] text-[var(--text-primary)] shadow-lg hover:bg-[var(--bg-hover)] transition-all cursor-pointer z-10"
          aria-label="Прокрутить в конец"
          title="Вниз"
        >
          <ArrowDown size={18} />
        </button>
      )}

      {/* Error banner above input */}
      {errorMessage && (
        <div className="px-3 sm:px-6 py-2 bg-[var(--bg-primary)]">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-[var(--danger-bg)] border border-[var(--danger-color)]/30 text-xs text-[var(--text-primary)]">
            <div className="flex items-center gap-2 min-w-0">
              <AlertCircle size={16} className="text-[var(--danger-color)] shrink-0" />
              <span className="truncate">{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={onDismissError}
              className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-md hover:bg-black/20 cursor-pointer transition-colors"
              aria-label="Закрыть ошибку"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Input Composer */}
      <Composer
        input={input}
        setInput={setInput}
        onSend={() => onSendMessage()}
        isLoading={isLoading}
      />
    </div>
  );
};
