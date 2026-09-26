import React, { useRef } from 'react';
import {
  Sparkles,
  Plus,
  MessageSquare,
  Trash2,
  Settings,
  Download,
  Upload,
  X,
  ShieldAlert,
} from 'lucide-react';
import { ChatSession } from '../lib/storage';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  chats: ChatSession[];
  activeChatId: string;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onDeleteChat: (id: string) => void;
  onOpenSettings: () => void;
  onExportChats: () => void;
  onImportChats: (file: File) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  chats,
  activeChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  onOpenSettings,
  onExportChats,
  onImportChats,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportChats(file);
    }
    // reset input so same file can be re-selected if needed
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleSelectChat = (id: string) => {
    onSelectChat(id);
    onClose();
  };

  const handleNewChat = () => {
    onNewChat();
    onClose();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full w-[280px] bg-[var(--bg-panel)] border-r border-[var(--border-color)] select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-1.5">
              <span className="text-[var(--accent-color)]">✨</span> GigaChat
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-panel-secondary)] border border-[var(--border-color)] text-[var(--accent-color)] font-medium">
              Open client
            </span>
          </div>
          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
            Неофициальный клиент GigaChat API
          </p>
        </div>

        {/* Close button on mobile */}
        <button
          type="button"
          onClick={onClose}
          className="md:hidden p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-hover)]"
          aria-label="Закрыть меню"
        >
          <X size={18} />
        </button>
      </div>

      {/* New Chat Button */}
      <div className="p-3">
        <button
          type="button"
          onClick={handleNewChat}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[var(--accent-color)] text-white hover:bg-[var(--accent-hover)] font-medium text-sm transition-all shadow-sm active:scale-[0.99] cursor-pointer"
        >
          <Plus size={16} />
          <span>Новый чат</span>
        </button>
      </div>

      {/* Chats Section */}
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
        <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Чаты
        </div>

        {chats.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-[var(--text-muted)]">
            Нет сохранённых чатов
          </div>
        ) : (
          chats.map(chat => {
            const isActive = chat.id === activeChatId;
            return (
              <div
                key={chat.id}
                className={`group relative flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-xs transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[var(--bg-panel-secondary)] text-[var(--text-primary)] font-medium border border-[var(--border-color)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                }`}
                onClick={() => handleSelectChat(chat.id)}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <MessageSquare
                    size={14}
                    className={`shrink-0 ${
                      isActive ? 'text-[var(--accent-color)]' : 'text-[var(--text-muted)]'
                    }`}
                  />
                  <span className="truncate">{chat.title || 'Новый чат'}</span>
                </div>

                {/* Delete button (shows on hover or active) */}
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    onDeleteChat(chat.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--danger-color)] hover:bg-[var(--danger-bg)] transition-all cursor-pointer"
                  title="Удалить чат"
                  aria-label="Удалить чат"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Footer Actions */}
      <div className="p-3 border-t border-[var(--border-color)] space-y-1">
        <button
          type="button"
          onClick={() => {
            onOpenSettings();
            onClose();
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
        >
          <Settings size={15} />
          <span>Настройки</span>
        </button>

        <button
          type="button"
          onClick={onExportChats}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
        >
          <Download size={15} />
          <span>Экспорт чатов</span>
        </button>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
        >
          <Upload size={15} />
          <span>Импорт чатов</span>
        </button>

        {/* Hidden file input for import */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".json,application/json"
          className="hidden"
          aria-label="Загрузить резервную копию"
        />
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop static sidebar */}
      <aside className="hidden md:block shrink-0 h-full">
        {sidebarContent}
      </aside>

      {/* Mobile drawer with backdrop */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Sliding panel */}
          <div className="relative z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
