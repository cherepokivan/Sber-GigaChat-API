import React from 'react';
import { Menu, Settings, Sun, Moon, RefreshCw, ChevronDown, CheckCircle2, AlertCircle } from 'lucide-react';

export type ApiStatus = 'idle' | 'checking' | 'connected' | 'error';

interface TopBarProps {
  onOpenSidebar: () => void;
  onOpenSettings: () => void;
  selectedModel: string;
  onSelectModel: (model: string) => void;
  availableModels: string[];
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  apiStatus: ApiStatus;
  statusText?: string;
  onCheckConnection: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  onOpenSidebar,
  onOpenSettings,
  selectedModel,
  onSelectModel,
  availableModels,
  theme,
  onToggleTheme,
  apiStatus,
  statusText,
  onCheckConnection,
}) => {
  const renderStatus = () => {
    switch (apiStatus) {
      case 'checking':
        return (
          <div className="flex items-center gap-1.5 text-xs text-[var(--accent-color)] font-medium">
            <RefreshCw size={13} className="animate-spin" />
            <span className="hidden sm:inline">Проверка…</span>
          </div>
        );
      case 'connected':
        return (
          <button
            type="button"
            onClick={onCheckConnection}
            title="Нажмите для повторной проверки"
            className="flex items-center gap-1.5 text-xs text-[var(--success-color)] font-medium hover:opacity-80 transition-opacity cursor-pointer"
          >
            <span className="w-2 h-2 rounded-full bg-[var(--success-color)] shadow-[0_0_8px_rgba(74,222,128,0.5)]" />
            <span className="hidden sm:inline">
              {statusText || `Подключено · ${availableModels.length} моделей`}
            </span>
            <span className="sm:hidden">Онлайн</span>
          </button>
        );
      case 'error':
        return (
          <button
            type="button"
            onClick={onOpenSettings}
            title="Ошибка авторизации. Открыть настройки"
            className="flex items-center gap-1.5 text-xs text-[var(--danger-color)] font-medium hover:opacity-80 transition-opacity cursor-pointer"
          >
            <span className="w-2 h-2 rounded-full bg-[var(--danger-color)]" />
            <span className="hidden sm:inline">Ошибка подключения</span>
            <span className="sm:hidden">Ошибка</span>
          </button>
        );
      case 'idle':
      default:
        return (
          <button
            type="button"
            onClick={onOpenSettings}
            title="Нажмите, чтобы ввести Access Token"
            className="flex items-center gap-1.5 text-xs text-[var(--warning-color)] font-medium hover:opacity-80 transition-opacity cursor-pointer"
          >
            <span className="w-2 h-2 rounded-full bg-[var(--warning-color)]" />
            <span className="hidden sm:inline">Токен не задан</span>
            <span className="sm:hidden">Без токена</span>
          </button>
        );
    }
  };

  return (
    <header className="h-14 w-full bg-[var(--bg-panel)] border-b border-[var(--border-color)] px-3 sm:px-4 flex items-center justify-between shrink-0 select-none z-10">
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mobile menu trigger */}
        <button
          type="button"
          onClick={onOpenSidebar}
          className="md:hidden p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
          aria-label="Открыть меню чатов"
        >
          <Menu size={20} />
        </button>

        {/* Model dropdown */}
        <div className="relative flex items-center">
          <label htmlFor="model-select" className="sr-only">Выбор модели</label>
          <div className="relative inline-flex items-center">
            <select
              id="model-select"
              value={selectedModel}
              onChange={e => onSelectModel(e.target.value)}
              className="appearance-none bg-[var(--bg-panel-secondary)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] text-xs sm:text-sm font-medium py-1.5 pl-3 pr-8 rounded-lg border border-[var(--border-color)] hover:border-[var(--border-color-light)] focus:outline-none focus:border-[var(--accent-color)] cursor-pointer transition-all max-w-[160px] sm:max-w-[220px] truncate"
            >
              {availableModels.map(m => (
                <option key={m} value={m} className="bg-[var(--bg-panel)] text-[var(--text-primary)]">
                  {m}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="absolute right-2.5 text-[var(--text-muted)] pointer-events-none"
            />
          </div>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Connection status badge */}
        <div className="px-2.5 py-1 rounded-full bg-[var(--bg-panel-secondary)] border border-[var(--border-color)] flex items-center">
          {renderStatus()}
        </div>

        {/* Theme toggle */}
        <button
          type="button"
          onClick={onToggleTheme}
          className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
          aria-label={theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'}
          title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Settings button */}
        <button
          type="button"
          onClick={onOpenSettings}
          className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
          aria-label="Настройки подключения"
          title="Настройки"
        >
          <Settings size={18} />
        </button>
      </div>
    </header>
  );
};
