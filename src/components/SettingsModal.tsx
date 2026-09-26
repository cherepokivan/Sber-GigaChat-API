import React, { useState, useEffect } from 'react';
import {
  X,
  Key,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Eye,
  EyeOff,
  Sliders,
  Cpu,
  Terminal,
  Trash2,
  Copy,
  Check,
} from 'lucide-react';
import { ApiStatus } from './TopBar';
import { ConnectionMode, sanitizeToken, isJwtToken, exchangeAuthKeyForToken } from '../lib/gigachat';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  accessToken: string;
  onSaveAccessToken: (token: string) => void;
  onDeleteAccessToken: () => void;
  authKey: string;
  onSaveAuthKey: (key: string) => void;
  connectionMode: ConnectionMode;
  onSaveConnectionMode: (mode: ConnectionMode) => void;
  selectedModel: string;
  onSelectModel: (model: string) => void;
  availableModels: string[];
  temperature: number;
  onSaveTemperature: (temp: number) => void;
  systemPrompt: string;
  onSaveSystemPrompt: (prompt: string) => void;
  apiStatus: ApiStatus;
  statusDetails: string | null;
  onCheckConnection: (tokenToTest?: string, modeToTest?: ConnectionMode) => Promise<void>;
  isChecking: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  accessToken,
  onSaveAccessToken,
  onDeleteAccessToken,
  authKey,
  onSaveAuthKey,
  connectionMode,
  onSaveConnectionMode,
  selectedModel,
  onSelectModel,
  availableModels,
  temperature,
  onSaveTemperature,
  systemPrompt,
  onSaveSystemPrompt,
  apiStatus,
  statusDetails,
  onCheckConnection,
  isChecking,
}) => {
  const [tokenInput, setTokenInput] = useState(accessToken);
  const [authKeyInput, setAuthKeyInput] = useState(authKey);
  const [showToken, setShowToken] = useState(false);
  const [showAuthKey, setShowAuthKey] = useState(false);
  const [showCurlHelper, setShowCurlHelper] = useState(false);
  const [curlCopied, setCurlCopied] = useState(false);
  const [isExchanging, setIsExchanging] = useState(false);
  const [exchangeError, setExchangeError] = useState<string | null>(null);
  const [exchangeSuccess, setExchangeSuccess] = useState<string | null>(null);
  const [selectedScope, setSelectedScope] = useState<'GIGACHAT_API_PERS' | 'GIGACHAT_API_B2B' | 'GIGACHAT_API_CORP'>('GIGACHAT_API_PERS');

  // Sync inputs on open
  useEffect(() => {
    if (isOpen) {
      setTokenInput(accessToken);
      setAuthKeyInput(authKey);
      setExchangeError(null);
      setExchangeSuccess(null);
    }
  }, [isOpen, accessToken, authKey]);

  // Handle Esc key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleApplyToken = () => {
    const cleanToken = sanitizeToken(tokenInput);
    const cleanKey = authKeyInput.trim();
    onSaveAccessToken(cleanToken);
    onSaveAuthKey(cleanKey);
    return { cleanToken, cleanKey };
  };

  const handleTest = async () => {
    const { cleanToken } = handleApplyToken();
    await onCheckConnection(cleanToken, connectionMode);
  };

  const handleAutoExchange = async () => {
    const cleanKey = authKeyInput.trim();
    if (!cleanKey) {
      setExchangeError('Введите Authorization Key (Client Secret) для автоматического получения токена.');
      return;
    }
    setIsExchanging(true);
    setExchangeError(null);
    setExchangeSuccess(null);

    try {
      const result = await exchangeAuthKeyForToken(cleanKey, selectedScope);
      const cleanNewToken = sanitizeToken(result.accessToken);
      setTokenInput(cleanNewToken);
      onSaveAccessToken(cleanNewToken);
      onSaveAuthKey(cleanKey);
      setExchangeSuccess('Access Token успешно получен и сохранён!');
      // Immediately test connection with the new token
      await onCheckConnection(cleanNewToken, connectionMode);
    } catch (err: any) {
      setExchangeError(err.message || 'Не удалось получить Access Token.');
    } finally {
      setIsExchanging(false);
    }
  };

  const handleDeleteToken = () => {
    setTokenInput('');
    setAuthKeyInput('');
    onDeleteAccessToken();
  };

  const curlCommand = `curl -L -X POST 'https://ngw.devices.sberbank.ru:9443/api/v2/oauth' \\
  -H 'Content-Type: application/x-www-form-urlencoded' \\
  -H 'Accept: application/json' \\
  -H 'RqUID: ${Math.random().toString(36).substring(2, 10)}-${Date.now()}' \\
  -H 'Authorization: Basic ${authKeyInput.trim() || 'ВАШ_AUTHORIZATION_KEY'}' \\
  --data-urlencode 'scope=GIGACHAT_API_PERS' -k`;

  const handleCopyCurl = async () => {
    try {
      await navigator.clipboard.writeText(curlCommand);
      setCurlCopied(true);
      setTimeout(() => setCurlCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-xl rounded-2xl bg-[var(--bg-panel)] border border-[var(--border-color)] shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--border-color)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-[var(--bg-panel-secondary)] border border-[var(--border-color)] text-[var(--accent-color)]">
              <Sliders size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[var(--text-primary)]">
                Настройки GigaChat
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Управление ключами, моделью и параметрами генерации
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
            aria-label="Закрыть настройки"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-6">
          {/* Section: Подключение */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Key size={16} className="text-[var(--accent-color)]" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Подключение
              </h3>
            </div>

            {/* Access Token Field */}
            <div className="space-y-1.5">
              <label
                htmlFor="access-token-input"
                className="block text-xs font-medium text-[var(--text-primary)]"
              >
                Access Token <span className="text-[var(--danger-color)]">*</span>
              </label>
              <div className="relative flex items-center">
                <input
                  id="access-token-input"
                  type={showToken ? 'text' : 'password'}
                  value={tokenInput}
                  onChange={e => setTokenInput(e.target.value)}
                  placeholder="Вставьте токен доступа (Bearer token)"
                  className="w-full bg-[var(--bg-panel-secondary)] border border-[var(--border-color)] focus:border-[var(--accent-color)] rounded-xl px-3 py-2 text-xs sm:text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none pr-10 font-mono"
                  autoComplete="off"
                  spellCheck="false"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-2.5 p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                  aria-label={showToken ? 'Скрыть токен' : 'Показать токен'}
                >
                  {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {tokenInput.trim() && (
                isJwtToken(tokenInput) ? (
                  <p className="text-[11px] text-[var(--success-color)] flex items-center gap-1 font-medium">
                    <Check size={12} />
                    <span>Формат JWT токена корректен (начинается с eyJ...)</span>
                  </p>
                ) : (
                  <p className="text-[11px] text-[var(--warning-color)] flex items-start gap-1 font-medium leading-tight">
                    <AlertCircle size={13} className="shrink-0 mt-0.5" />
                    <span>
                      Внимание: Значение не похоже на JWT токен (начинается с eyJ... и состоит из 3 частей через точку). Если вы скопировали Client Secret или Авторизационные данные, вставьте их в поле ниже и нажмите «Получить токен из ключа».
                    </span>
                  </p>
                )
              )}
              <p className="text-[11px] text-[var(--warning-color)]">
                ⚠️ Access Token временный. После истечения срока действия вставьте новый токен.
              </p>
            </div>

            {/* Authorization Key Field (Optional) */}
            <div className="space-y-1.5 pt-1">
              <label
                htmlFor="auth-key-input"
                className="block text-xs font-medium text-[var(--text-primary)]"
              >
                Authorization Key <span className="text-[var(--text-muted)] font-normal">(необязательно)</span>
              </label>
              <div className="relative flex items-center">
                <input
                  id="auth-key-input"
                  type={showAuthKey ? 'text' : 'password'}
                  value={authKeyInput}
                  onChange={e => setAuthKeyInput(e.target.value)}
                  placeholder="Client Secret / Авторизационные данные"
                  className="w-full bg-[var(--bg-panel-secondary)] border border-[var(--border-color)] focus:border-[var(--accent-color)] rounded-xl px-3 py-2 text-xs sm:text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none pr-10 font-mono"
                  autoComplete="off"
                  spellCheck="false"
                />
                <button
                  type="button"
                  onClick={() => setShowAuthKey(!showAuthKey)}
                  className="absolute right-2.5 p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                  aria-label={showAuthKey ? 'Скрыть ключ' : 'Показать ключ'}
                >
                  {showAuthKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Auto Exchange button & Scope selector */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-[11px] text-[var(--text-muted)]">Scope:</span>
                  <select
                    value={selectedScope}
                    onChange={e => setSelectedScope(e.target.value as any)}
                    className="text-[11px] bg-[var(--bg-panel-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded px-1.5 py-0.5 focus:outline-none"
                  >
                    <option value="GIGACHAT_API_PERS">GIGACHAT_API_PERS (Физ. лица)</option>
                    <option value="GIGACHAT_API_B2B">GIGACHAT_API_B2B (ИП и Юр. лица)</option>
                    <option value="GIGACHAT_API_CORP">GIGACHAT_API_CORP (Корпорации)</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleAutoExchange}
                  disabled={isExchanging || !authKeyInput.trim()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--accent-color)] text-white hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium transition-colors cursor-pointer shadow-sm"
                >
                  {isExchanging ? (
                    <>
                      <RefreshCw size={12} className="animate-spin" />
                      <span>Получение токена…</span>
                    </>
                  ) : (
                    <>
                      <Key size={12} />
                      <span>Получить токен из ключа</span>
                    </>
                  )}
                </button>
              </div>

              {exchangeSuccess && (
                <p className="text-[11px] text-[var(--success-color)] flex items-center gap-1 font-medium mt-1">
                  <Check size={12} />
                  <span>{exchangeSuccess}</span>
                </p>
              )}

              {exchangeError && (
                <p className="text-[11px] text-[var(--danger-color)] flex items-start gap-1 font-medium mt-1 leading-tight">
                  <AlertCircle size={13} className="shrink-0 mt-0.5" />
                  <span>{exchangeError}</span>
                </p>
              )}
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[var(--text-muted)]">
                  Хранится только локально в браузере.
                </span>
                <button
                  type="button"
                  onClick={() => setShowCurlHelper(!showCurlHelper)}
                  className="text-[11px] text-[var(--accent-color)] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Terminal size={12} />
                  <span>Команда cURL для обмена на токен</span>
                </button>
              </div>
            </div>

            {/* cURL helper dropdown */}
            {showCurlHelper && (
              <div className="p-3 rounded-xl bg-[var(--bg-panel-secondary)] border border-[var(--border-color)] text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-[var(--text-primary)]">
                    Обмен ключа на Access Token через терминал:
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCurl}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--bg-hover)] text-[var(--text-primary)] hover:bg-[var(--border-color)] transition-colors cursor-pointer"
                  >
                    {curlCopied ? <Check size={12} className="text-[var(--success-color)]" /> : <Copy size={12} />}
                    <span>{curlCopied ? 'Скопировано' : 'Копировать'}</span>
                  </button>
                </div>
                <pre className="p-2.5 rounded-lg bg-[var(--code-bg)] text-[11px] font-mono text-[var(--text-primary)] overflow-x-auto leading-relaxed border border-[var(--border-color)]">
                  {curlCommand}
                </pre>
                <p className="text-[11px] text-[var(--text-muted)] leading-normal">
                  Выполните команду в терминале, скопируйте полученное значение <code>access_token</code> и вставьте в поле выше.
                </p>
              </div>
            )}

            {/* Connection Mode Selection */}
            <div className="space-y-1.5 pt-1">
              <label className="block text-xs font-medium text-[var(--text-primary)]">
                Режим запросов (CORS & Proxy)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onSaveConnectionMode('proxy')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    connectionMode === 'proxy'
                      ? 'bg-[var(--accent-bg)] border-[var(--accent-color)] text-[var(--text-primary)]'
                      : 'bg-[var(--bg-panel-secondary)] border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--border-color-light)]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-[var(--text-primary)]">
                      Vercel / Local Proxy
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--success-bg)] text-[var(--success-color)] font-medium">
                      Рекомендуется
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] leading-tight">
                    Обходит блокировку CORS в браузере и проблемы с сертификатами Минцифры
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => onSaveConnectionMode('direct')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    connectionMode === 'direct'
                      ? 'bg-[var(--accent-bg)] border-[var(--accent-color)] text-[var(--text-primary)]'
                      : 'bg-[var(--bg-panel-secondary)] border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--border-color-light)]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-[var(--text-primary)]">
                      Прямой запрос
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] leading-tight">
                    Direct https://api.giga.chat (требует установленные сертификаты Минцифры)
                  </p>
                </button>
              </div>
            </div>

            {/* Actions: Test connection & Delete token */}
            <div className="pt-2 flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleTest}
                disabled={isChecking || !tokenInput.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--accent-color)] text-white hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed font-medium text-xs transition-colors cursor-pointer shadow-sm"
              >
                {isChecking ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Проверка…</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} />
                    <span>Проверить подключение</span>
                  </>
                )}
              </button>

              {accessToken && (
                <button
                  type="button"
                  onClick={handleDeleteToken}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[var(--danger-color)] hover:bg-[var(--danger-bg)] border border-[var(--danger-color)]/30 text-xs font-medium transition-colors cursor-pointer"
                >
                  <Trash2 size={14} />
                  <span>Удалить сохранённый токен</span>
                </button>
              )}
            </div>

            {/* Status indicator display */}
            {apiStatus === 'connected' && (
              <div className="p-3 rounded-xl bg-[var(--success-bg)] border border-[var(--success-color)]/30 flex items-center gap-2.5 text-xs text-[var(--success-color)]">
                <CheckCircle2 size={16} className="shrink-0" />
                <span className="font-medium">
                  {statusDetails || 'Подключено. Список моделей успешно обновлен.'}
                </span>
              </div>
            )}

            {apiStatus === 'error' && statusDetails && (
              <div className="p-3 rounded-xl bg-[var(--danger-bg)] border border-[var(--danger-color)]/30 flex items-start gap-2.5 text-xs text-[var(--danger-color)]">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <div className="leading-relaxed">{statusDetails}</div>
              </div>
            )}

            {/* Security Notice */}
            <div className="p-3 rounded-xl bg-[var(--bg-panel-secondary)] border border-[var(--border-color)] flex items-start gap-2.5 text-xs text-[var(--text-muted)]">
              <ShieldAlert size={16} className="text-[var(--warning-color)] shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                Cookie доступна JavaScript и не является HttpOnly-хранилищем. Не вводите свои ключи на чужих или публичных компьютерах.
              </p>
            </div>
          </div>

          {/* Section: Модель */}
          <div className="space-y-3 pt-3 border-t border-[var(--border-color)]">
            <div className="flex items-center gap-2">
              <Cpu size={16} className="text-[var(--accent-color)]" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Модель
              </h3>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="settings-model" className="block text-xs font-medium text-[var(--text-primary)]">
                Используемая модель
              </label>
              <select
                id="settings-model"
                value={selectedModel}
                onChange={e => onSelectModel(e.target.value)}
                className="w-full bg-[var(--bg-panel-secondary)] border border-[var(--border-color)] focus:border-[var(--accent-color)] rounded-xl px-3 py-2 text-xs sm:text-sm text-[var(--text-primary)] focus:outline-none cursor-pointer"
              >
                {availableModels.map(m => (
                  <option key={m} value={m} className="bg-[var(--bg-panel)]">
                    {m}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-[var(--text-muted)]">
                Доступно {availableModels.length} моделей (загружаются через GET /v1/models)
              </p>
            </div>
          </div>

          {/* Section: Параметры */}
          <div className="space-y-3 pt-3 border-t border-[var(--border-color)]">
            <div className="flex items-center gap-2">
              <Sliders size={16} className="text-[var(--accent-color)]" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Параметры
              </h3>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <label htmlFor="temperature-range" className="font-medium text-[var(--text-primary)]">
                  Температура (Temperature)
                </label>
                <span className="font-mono px-2 py-0.5 rounded bg-[var(--bg-panel-secondary)] border border-[var(--border-color)] text-[var(--accent-color)]">
                  {temperature.toFixed(1)}
                </span>
              </div>
              <input
                id="temperature-range"
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={temperature}
                onChange={e => onSaveTemperature(parseFloat(e.target.value))}
                className="w-full accent-[var(--accent-color)] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[var(--text-muted)]">
                <span>0.0 (Строго и точно)</span>
                <span>1.0 (Баланс)</span>
                <span>2.0 (Максимальная креативность)</span>
              </div>
            </div>
          </div>

          {/* Section: Системный промпт */}
          <div className="space-y-3 pt-3 border-t border-[var(--border-color)]">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Системный промпт
              </h3>
              <button
                type="button"
                onClick={() => onSaveSystemPrompt('Отвечай на русском языке, понятно и структурированно.')}
                className="text-[11px] text-[var(--accent-color)] hover:underline cursor-pointer"
              >
                По умолчанию
              </button>
            </div>

            <textarea
              rows={3}
              value={systemPrompt}
              onChange={e => onSaveSystemPrompt(e.target.value)}
              placeholder="Инструкция для модели (например: Отвечай кратко и структурированно)"
              className="w-full resize-none bg-[var(--bg-panel-secondary)] border border-[var(--border-color)] focus:border-[var(--accent-color)] rounded-xl p-3 text-xs sm:text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none font-sans leading-relaxed"
            />
            <p className="text-[11px] text-[var(--text-muted)]">
              Добавляется как первое системное сообщение при каждом запросе к API.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-[var(--border-color)] flex items-center justify-end gap-2 shrink-0 bg-[var(--bg-panel)]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
          >
            Готово
          </button>
        </div>
      </div>
    </div>
  );
};
