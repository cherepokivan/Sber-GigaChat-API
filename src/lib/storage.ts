/**
 * GigaChat Open Client - Local Storage Module
 * 
 * Manages chats, settings, themes, and application state.
 * CRITICAL SECURITY RULE:
 * Access Token is NEVER stored in localStorage and NEVER exported in backups.
 */

export interface MessageItem {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  time: number;
  model?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: MessageItem[];
  createdAt: number;
  updatedAt: number;
}

export interface AppSettings {
  model: string;
  temperature: number;
  systemPrompt: string;
  theme: 'dark' | 'light';
}

const STORAGE_KEYS = {
  CHATS: 'gc_chats',
  ACTIVE_CHAT: 'gc_active_chat',
  THEME: 'gc_theme',
  MODEL: 'gc_model',
  TEMPERATURE: 'gc_temperature',
  SYSTEM_PROMPT: 'gc_system_prompt',
  MODELS_LIST: 'gc_models_cache',
  AUTH_KEY: 'gc_auth_key', // Optional authorization key (stored strictly locally if entered)
  CONNECTION_MODE: 'gc_connection_mode', // 'proxy' (default) or 'direct'
} as const;

export const DEFAULT_MODEL = 'GigaChat-2';
export const DEFAULT_TEMPERATURE = 0.7;
export const DEFAULT_SYSTEM_PROMPT = 'Отвечай на русском языке, понятно и структурированно.';
export const DEFAULT_THEME = 'dark';
export const DEFAULT_CONNECTION_MODE: 'proxy' | 'direct' = 'proxy';

/**
 * Get connection mode (proxy for Vercel/Local or direct https://api.giga.chat)
 */
export function getStoredConnectionMode(): 'proxy' | 'direct' {
  try {
    const val = localStorage.getItem(STORAGE_KEYS.CONNECTION_MODE);
    if (val === 'direct' || val === 'proxy') return val;
  } catch {
    // ignore
  }
  return DEFAULT_CONNECTION_MODE;
}

export function saveStoredConnectionMode(mode: 'proxy' | 'direct'): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CONNECTION_MODE, mode);
  } catch {
    // ignore
  }
}

/**
 * Load chats from localStorage
 */
export function getStoredChats(): ChatSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CHATS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (e) {
    console.error('Error reading chats from localStorage', e);
  }
  return [];
}

/**
 * Save chats to localStorage
 */
export function saveStoredChats(chats: ChatSession[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify(chats));
  } catch (e) {
    console.error('Error saving chats to localStorage', e);
  }
}

/**
 * Get active chat ID
 */
export function getActiveChatId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_CHAT);
  } catch {
    return null;
  }
}

/**
 * Save active chat ID
 */
export function saveActiveChatId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_CHAT, id);
  } catch {
    // ignore
  }
}

/**
 * Get theme
 */
export function getStoredTheme(): 'dark' | 'light' {
  try {
    const theme = localStorage.getItem(STORAGE_KEYS.THEME);
    if (theme === 'light' || theme === 'dark') return theme;
  } catch {
    // ignore
  }
  return DEFAULT_THEME;
}

/**
 * Save theme
 */
export function saveStoredTheme(theme: 'dark' | 'light'): void {
  try {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  } catch {
    // ignore
  }
}

/**
 * Get model
 */
export function getStoredModel(): string {
  try {
    return localStorage.getItem(STORAGE_KEYS.MODEL) || DEFAULT_MODEL;
  } catch {
    return DEFAULT_MODEL;
  }
}

/**
 * Save model
 */
export function saveStoredModel(model: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.MODEL, model);
  } catch {
    // ignore
  }
}

/**
 * Get temperature
 */
export function getStoredTemperature(): number {
  try {
    const val = localStorage.getItem(STORAGE_KEYS.TEMPERATURE);
    if (val !== null) {
      const num = parseFloat(val);
      if (!isNaN(num) && num >= 0 && num <= 2) return num;
    }
  } catch {
    // ignore
  }
  return DEFAULT_TEMPERATURE;
}

/**
 * Save temperature
 */
export function saveStoredTemperature(temperature: number): void {
  try {
    localStorage.setItem(STORAGE_KEYS.TEMPERATURE, temperature.toString());
  } catch {
    // ignore
  }
}

/**
 * Get system prompt
 */
export function getStoredSystemPrompt(): string {
  try {
    const val = localStorage.getItem(STORAGE_KEYS.SYSTEM_PROMPT);
    if (val !== null) return val;
  } catch {
    // ignore
  }
  return DEFAULT_SYSTEM_PROMPT;
}

/**
 * Save system prompt
 */
export function saveStoredSystemPrompt(prompt: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SYSTEM_PROMPT, prompt);
  } catch {
    // ignore
  }
}

/**
 * Get models cache
 */
export function getStoredModelsList(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MODELS_LIST);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  return [DEFAULT_MODEL, 'GigaChat-Plus', 'GigaChat-Pro'];
}

/**
 * Save models cache
 */
export function saveStoredModelsList(models: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.MODELS_LIST, JSON.stringify(models));
  } catch {
    // ignore
  }
}

/**
 * Optional Authorization Key (stored strictly locally, never exported)
 */
export function getStoredAuthKey(): string {
  try {
    return localStorage.getItem(STORAGE_KEYS.AUTH_KEY) || '';
  } catch {
    return '';
  }
}

export function saveStoredAuthKey(key: string): void {
  try {
    if (!key.trim()) {
      localStorage.removeItem(STORAGE_KEYS.AUTH_KEY);
    } else {
      localStorage.setItem(STORAGE_KEYS.AUTH_KEY, key.trim());
    }
  } catch {
    // ignore
  }
}

export function deleteStoredAuthKey(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.AUTH_KEY);
  } catch {
    // ignore
  }
}

/**
 * Export chats and settings to a clean JSON string.
 * CRITICAL: Under NO circumstances are tokens or keys included.
 */
export function exportBackup(chats: ChatSession[], settings: AppSettings): string {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    chats,
    settings: {
      model: settings.model,
      temperature: settings.temperature,
      systemPrompt: settings.systemPrompt,
      theme: settings.theme,
    },
  };
  return JSON.stringify(payload, null, 2);
}

/**
 * Validate and parse imported backup JSON
 */
export function validateAndImportBackup(jsonString: string): {
  chats: ChatSession[];
  settings?: Partial<AppSettings>;
} {
  const data = JSON.parse(jsonString);
  if (!data || typeof data !== 'object') {
    throw new Error('Некорректный формат файла резервной копии.');
  }

  if (!Array.isArray(data.chats)) {
    throw new Error('Файл не содержит список чатов (поле "chats").');
  }

  // Validate each chat
  const sanitizedChats: ChatSession[] = data.chats.map((chat: any, index: number) => {
    if (!chat || typeof chat !== 'object') {
      throw new Error(`Некорректный элемент чата на позиции ${index + 1}.`);
    }
    const id = String(chat.id || `imported-${Date.now()}-${index}`);
    const title = String(chat.title || 'Импортированный чат');
    const createdAt = Number(chat.createdAt) || Date.now();
    const updatedAt = Number(chat.updatedAt) || Date.now();
    const messages: MessageItem[] = Array.isArray(chat.messages)
      ? chat.messages.map((m: any, mIdx: number) => ({
          id: String(m.id || `msg-${Date.now()}-${mIdx}`),
          role: m.role === 'assistant' ? 'assistant' : m.role === 'system' ? 'system' : 'user',
          content: String(m.content || ''),
          time: Number(m.time) || Date.now(),
          model: m.model ? String(m.model) : undefined,
        }))
      : [];

    return {
      id,
      title,
      messages,
      createdAt,
      updatedAt,
    };
  });

  let sanitizedSettings: Partial<AppSettings> | undefined;
  if (data.settings && typeof data.settings === 'object') {
    sanitizedSettings = {
      model: typeof data.settings.model === 'string' ? data.settings.model : undefined,
      temperature:
        typeof data.settings.temperature === 'number' && !isNaN(data.settings.temperature)
          ? Math.max(0, Math.min(2, data.settings.temperature))
          : undefined,
      systemPrompt:
        typeof data.settings.systemPrompt === 'string' ? data.settings.systemPrompt : undefined,
      theme: data.settings.theme === 'light' || data.settings.theme === 'dark' ? data.settings.theme : undefined,
    };
  }

  return {
    chats: sanitizedChats,
    settings: sanitizedSettings,
  };
}
