/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopBar, ApiStatus } from './components/TopBar';
import { ChatView } from './components/ChatView';
import { SettingsModal } from './components/SettingsModal';
import { useChats } from './hooks/useChats';
import {
  ACCESS_TOKEN_COOKIE_NAME,
  getCookie,
  setCookie,
  deleteCookie,
} from './lib/cookies';
import {
  getStoredModel,
  saveStoredModel,
  getStoredTemperature,
  saveStoredTemperature,
  getStoredSystemPrompt,
  saveStoredSystemPrompt,
  getStoredTheme,
  saveStoredTheme,
  getStoredModelsList,
  saveStoredModelsList,
  getStoredAuthKey,
  saveStoredAuthKey,
  deleteStoredAuthKey,
  getStoredConnectionMode,
  saveStoredConnectionMode,
  exportBackup,
  validateAndImportBackup,
} from './lib/storage';
import { getModels, sendChatCompletion, formatGigaChatError, ConnectionMode } from './lib/gigachat';

export default function App() {
  // Theme state
  const [theme, setTheme] = useState<'dark' | 'light'>(() => getStoredTheme());

  // Apply theme to document element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    saveStoredTheme(theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Auth & Token state
  const [accessToken, setAccessToken] = useState<string>(() =>
    getCookie(ACCESS_TOKEN_COOKIE_NAME)
  );
  const [authKey, setAuthKey] = useState<string>(() => getStoredAuthKey());
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>(() =>
    getStoredConnectionMode()
  );

  // Settings state
  const [selectedModel, setSelectedModel] = useState<string>(() => getStoredModel());
  const [availableModels, setAvailableModels] = useState<string[]>(() =>
    getStoredModelsList()
  );
  const [temperature, setTemperature] = useState<number>(() =>
    getStoredTemperature()
  );
  const [systemPrompt, setSystemPrompt] = useState<string>(() =>
    getStoredSystemPrompt()
  );

  // Connection status
  const [apiStatus, setApiStatus] = useState<ApiStatus>(() =>
    accessToken ? 'checking' : 'idle'
  );
  const [statusDetails, setStatusDetails] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(false);

  // Chat management
  const {
    chats,
    activeChat,
    activeChatId,
    createNewChat,
    deleteChat,
    selectChat,
    addMessage,
    removeLastAssistantMessage,
    setAllChats,
  } = useChats();

  // Chat input and sending state
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // Modal / Drawer state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Connection check function
  const checkConnection = useCallback(
    async (tokenOverride?: string, modeOverride?: ConnectionMode) => {
      const token = tokenOverride !== undefined ? tokenOverride : accessToken;
      const mode = modeOverride !== undefined ? modeOverride : connectionMode;
      if (!token) {
        setApiStatus('idle');
        setStatusDetails('Токен не задан. Вставьте Access Token в настройках.');
        return;
      }

      setIsChecking(true);
      setApiStatus('checking');
      setStatusDetails('Проверка подключения к GigaChat API…');

      try {
        const models = await getModels(token, mode);
        setApiStatus('connected');
        setAvailableModels(models);
        saveStoredModelsList(models);
        setStatusDetails(`Подключено. Найдено моделей: ${models.length}`);

        // If current model is not in returned list, select the first available
        if (models.length > 0 && !models.includes(selectedModel)) {
          setSelectedModel(models[0]);
          saveStoredModel(models[0]);
        }
      } catch (err: any) {
        setApiStatus('error');
        const formattedErr = formatGigaChatError(err);
        setStatusDetails(formattedErr);
      } finally {
        setIsChecking(false);
      }
    },
    [accessToken, connectionMode, selectedModel]
  );

  // Initial check on mount if token exists in cookie
  useEffect(() => {
    if (accessToken) {
      checkConnection(accessToken, connectionMode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveConnectionMode = (mode: ConnectionMode) => {
    setConnectionMode(mode);
    saveStoredConnectionMode(mode);
  };

  // Save / Delete Access Token
  const handleSaveAccessToken = (newToken: string) => {
    setAccessToken(newToken);
    if (newToken) {
      setCookie(ACCESS_TOKEN_COOKIE_NAME, newToken);
    } else {
      deleteCookie(ACCESS_TOKEN_COOKIE_NAME);
      setApiStatus('idle');
      setStatusDetails(null);
    }
  };

  const handleDeleteAccessToken = () => {
    deleteCookie(ACCESS_TOKEN_COOKIE_NAME);
    deleteStoredAuthKey();
    setAccessToken('');
    setAuthKey('');
    setApiStatus('idle');
    setStatusDetails(null);
  };

  const handleSaveAuthKey = (newKey: string) => {
    setAuthKey(newKey);
    saveStoredAuthKey(newKey);
  };

  const handleSaveModel = (model: string) => {
    setSelectedModel(model);
    saveStoredModel(model);
  };

  const handleSaveTemperature = (temp: number) => {
    setTemperature(temp);
    saveStoredTemperature(temp);
  };

  const handleSaveSystemPrompt = (prompt: string) => {
    setSystemPrompt(prompt);
    saveStoredSystemPrompt(prompt);
  };

  // Sending message
  const handleSendMessage = async (overrideContent?: string) => {
    const textToSend = overrideContent !== undefined ? overrideContent : input;
    if (!textToSend.trim() || isLoading) return;

    if (!accessToken) {
      setSendError('Access Token не задан. Откройте настройки и укажите токен.');
      setIsSettingsOpen(true);
      return;
    }

    setSendError(null);
    setInput('');
    setIsLoading(true);

    const currentChatId = activeChat?.id || createNewChat();

    // 1. Add user message
    const userMsg = addMessage(currentChatId, {
      role: 'user',
      content: textToSend.trim(),
    });

    // 2. Prepare message history for GigaChat completion
    const currentMessages = activeChat ? activeChat.messages : [];
    const historyPayload = [
      ...currentMessages.map(m => ({
        role: m.role,
        content: m.content,
      })),
      { role: 'user' as const, content: userMsg.content },
    ];

    try {
      const response = await sendChatCompletion({
        accessToken,
        model: selectedModel,
        messages: historyPayload,
        temperature,
        systemPrompt,
        mode: connectionMode,
      });

      // 3. Add assistant response
      addMessage(currentChatId, {
        role: 'assistant',
        content: response.content,
        model: response.model,
      });
    } catch (err: any) {
      const message = formatGigaChatError(err);
      setSendError(message);

      // If token expired or unauthorized, update topbar status
      if (err.status === 401 || String(message).includes('401') || String(message).includes('истёк')) {
        setApiStatus('error');
        setStatusDetails('Срок действия Access Token истёк.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Retry last query
  const handleRetry = async () => {
    if (!activeChat || isLoading) return;
    const lastUserQuery = removeLastAssistantMessage(activeChat.id);
    if (lastUserQuery) {
      await handleSendMessage(lastUserQuery);
    }
  };

  // Export chats
  const handleExportChats = () => {
    try {
      const jsonContent = exportBackup(chats, {
        model: selectedModel,
        temperature,
        systemPrompt,
        theme,
      });

      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gigachat-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setSendError('Не удалось экспортировать чаты.');
    }
  };

  // Import chats
  const handleImportChats = (file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const text = e.target?.result as string;
        const imported = validateAndImportBackup(text);

        setAllChats(imported.chats);

        if (imported.settings) {
          if (imported.settings.model) handleSaveModel(imported.settings.model);
          if (imported.settings.temperature !== undefined)
            handleSaveTemperature(imported.settings.temperature);
          if (imported.settings.systemPrompt !== undefined)
            handleSaveSystemPrompt(imported.settings.systemPrompt);
          if (imported.settings.theme) setTheme(imported.settings.theme);
        }

        setSendError(null);
      } catch (err: any) {
        setSendError(err.message || 'Ошибка импорта файла резервной копии.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex h-screen h-[100dvh] w-full overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)] antialiased font-sans">
      {/* Sidebar for desktop & mobile drawer */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        chats={chats}
        activeChatId={activeChatId}
        onSelectChat={selectChat}
        onNewChat={createNewChat}
        onDeleteChat={deleteChat}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onExportChats={handleExportChats}
        onImportChats={handleImportChats}
      />

      {/* Main chat column */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
        <TopBar
          onOpenSidebar={() => setIsSidebarOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          selectedModel={selectedModel}
          onSelectModel={handleSaveModel}
          availableModels={availableModels}
          theme={theme}
          onToggleTheme={toggleTheme}
          apiStatus={apiStatus}
          statusText={
            apiStatus === 'connected'
              ? `Подключено · ${availableModels.length} моделей`
              : undefined
          }
          onCheckConnection={() => checkConnection()}
        />

        <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
          <ChatView
            chat={activeChat}
            input={input}
            setInput={setInput}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            errorMessage={sendError}
            onDismissError={() => setSendError(null)}
            onRetry={handleRetry}
            hasToken={Boolean(accessToken)}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
        </main>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        accessToken={accessToken}
        onSaveAccessToken={handleSaveAccessToken}
        onDeleteAccessToken={handleDeleteAccessToken}
        authKey={authKey}
        onSaveAuthKey={handleSaveAuthKey}
        connectionMode={connectionMode}
        onSaveConnectionMode={handleSaveConnectionMode}
        selectedModel={selectedModel}
        onSelectModel={handleSaveModel}
        availableModels={availableModels}
        temperature={temperature}
        onSaveTemperature={handleSaveTemperature}
        systemPrompt={systemPrompt}
        onSaveSystemPrompt={handleSaveSystemPrompt}
        apiStatus={apiStatus}
        statusDetails={statusDetails}
        onCheckConnection={checkConnection}
        isChecking={isChecking}
      />
    </div>
  );
}
