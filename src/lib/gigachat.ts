/**
 * GigaChat Open Client - API Integration Module
 * 
 * Official endpoints:
 * Base: https://api.giga.chat
 * Models: GET https://api.giga.chat/v1/models
 * Chat: POST https://api.giga.chat/v1/chat/completions
 * 
 * Complies with OpenAI-compatible chat completions format.
 * No hardcoded credentials. All tokens provided at runtime.
 */

export const GIGACHAT_DIRECT_BASE_URL = 'https://api.giga.chat';
export const GIGACHAT_PROXY_BASE_URL = '/api/gigachat';

// Legacy export for backwards compatibility
export const GIGACHAT_BASE_URL = GIGACHAT_DIRECT_BASE_URL;

export type ConnectionMode = 'proxy' | 'direct';

export interface ChatMessagePayload {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionParams {
  accessToken: string;
  model: string;
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  temperature?: number;
  systemPrompt?: string;
  mode?: ConnectionMode;
}

export interface GigaChatModelItem {
  id: string;
  object?: string;
  owned_by?: string;
  type?: string;
}

export interface ModelsResponse {
  data?: GigaChatModelItem[];
  object?: string;
}

/**
 * Normalizes and cleans the token from common user copy-paste errors:
 * - Strips redundant 'Bearer '
 * - Strips quotes (" or ')
 * - Removes internal whitespace, newlines (\r, \n) caused by terminal line wrapping
 */
export function sanitizeToken(token: string): string {
  if (!token) return '';
  let clean = token.trim();
  while (clean.toLowerCase().startsWith('bearer ')) {
    clean = clean.slice(7).trim();
  }
  clean = clean.replace(/["']/g, '');
  clean = clean.replace(/\s+/g, '');
  return clean;
}

/**
 * Checks if a token matches the standard structure of a JWT Access Token:
 * Starts with 'eyJ' and has 3 parts separated by dots.
 */
export function isJwtToken(token: string): boolean {
  const clean = sanitizeToken(token);
  const parts = clean.split('.');
  return parts.length === 3 && clean.startsWith('eyJ');
}

/**
 * Normalizes HTTP/Fetch errors into human-friendly Russian messages
 */
export function formatGigaChatError(error: any): string {
  if (!error) return 'Неизвестная ошибка при обращении к GigaChat API.';

  // If already customized message
  if (typeof error === 'string') return error;

  const status = error.status || error.statusCode;

  if (status === 401) {
    return 'GigaChat вернул ошибку авторизации (HTTP 401 Unauthorized). Проверьте корректность Access Token или scope.';
  }
  if (status === 403) {
    return 'Доступ запрещен (HTTP 403). Проверьте права и подключенные пакеты вашего аккаунта GigaChat.';
  }
  if (status === 429) {
    return 'Слишком много запросов (HTTP 429). Превышен лимит токенов/запросов, попробуйте позже.';
  }
  if (status === 400) {
    return error.details || 'Некорректный запрос (HTTP 400). Проверьте выбранную модель или формат сообщений.';
  }
  if (status >= 500 && status <= 504) {
    return `GigaChat API временно недоступен (HTTP ${status}). Повторите попытку позже.`;
  }

  // Network / CORS detection
  const message = error.message || '';
  if (
    message.includes('Failed to fetch') ||
    message.includes('NetworkError') ||
    message.includes('Load failed') ||
    message.includes('CORS') ||
    error.name === 'TypeError'
  ) {
    return 'GigaChat API не разрешил прямой запрос из браузера (CORS / сетевая ошибка). Включен встроенный Vercel-прокси.';
  }

  return error.message || 'Ошибка соединения с GigaChat API.';
}

/**
 * Exchange Authorization Key for Access Token via OAuth proxy
 */
export async function exchangeAuthKeyForToken(
  authKey: string,
  scope: string = 'GIGACHAT_API_PERS'
): Promise<{ accessToken: string; expiresAt: number }> {
  let cleanKey = (authKey || '').trim();
  while (cleanKey.toLowerCase().startsWith('basic ')) {
    cleanKey = cleanKey.slice(6).trim();
  }
  cleanKey = cleanKey.replace(/["']/g, '').replace(/\s+/g, '');

  if (!cleanKey) {
    throw new Error('Укажите Authorization Key (Client Secret) для обмена на Access Token.');
  }

  let response: Response;
  try {
    response = await fetch('/api/gigachat?endpoint=oauth', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Basic ${cleanKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `scope=${encodeURIComponent(scope)}`,
    });
  } catch (err: any) {
    throw new Error('Не удалось подключиться к серверу OAuth: ' + (err.message || 'сетевая ошибка'));
  }

  if (!response.ok) {
    let errDetail = '';
    try {
      const errJson = await response.json();
      errDetail = errJson.message || errJson.error_description || errJson.error || '';
    } catch {
      // ignore
    }
    throw new Error(`Ошибка OAuth (HTTP ${response.status}): ${errDetail || 'Проверьте правильность Authorization Key и выбранный scope'}`);
  }

  const data = await response.json();
  if (!data?.access_token) {
    throw new Error('OAuth сервер вернул ответ без access_token.');
  }

  return {
    accessToken: data.access_token,
    expiresAt: data.expires_at || 0,
  };
}

/**
 * Fetch available models from GigaChat API
 * GET /v1/models (via Vercel proxy or direct)
 */
export async function getModels(accessToken: string, mode: ConnectionMode = 'proxy'): Promise<string[]> {
  const cleanToken = sanitizeToken(accessToken);
  if (!cleanToken) {
    throw new Error('Токен доступа (Access Token) не указан.');
  }

  const primaryUrl = mode === 'direct'
    ? `${GIGACHAT_DIRECT_BASE_URL}/v1/models`
    : `${GIGACHAT_PROXY_BASE_URL}/v1/models`;

  const fallbackUrl = mode === 'direct'
    ? `${GIGACHAT_PROXY_BASE_URL}/v1/models`
    : `${GIGACHAT_DIRECT_BASE_URL}/v1/models`;

  let response: Response;
  try {
    response = await fetch(primaryUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${cleanToken}`,
      },
    });
  } catch (err: any) {
    // If primary failed due to network / CORS, attempt fallback
    try {
      response = await fetch(fallbackUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${cleanToken}`,
        },
      });
    } catch {
      const errorMsg = formatGigaChatError(err);
      throw new Error(errorMsg);
    }
  }

  if (!response.ok) {
    let errorDetail = '';
    try {
      const errJson = await response.json();
      errorDetail = errJson.message || errJson.error?.message || errJson.description || '';
    } catch {
      // response might not be json
    }

    const err = {
      status: response.status,
      statusText: response.statusText,
      details: errorDetail,
      message: `API вернул HTTP ${response.status}`,
    };
    throw new Error(formatGigaChatError(err));
  }

  let data: any;
  try {
    data = await response.json();
  } catch {
    throw new Error('API вернул некорректный ответ (не JSON).');
  }

  // Normalize model list
  const modelIds: string[] = [];

  if (Array.isArray(data?.data)) {
    for (const item of data.data) {
      if (item && typeof item === 'object' && item.id) {
        modelIds.push(String(item.id));
      } else if (typeof item === 'string') {
        modelIds.push(item);
      }
    }
  } else if (Array.isArray(data)) {
    for (const item of data) {
      if (item && typeof item === 'object' && item.id) {
        modelIds.push(String(item.id));
      } else if (typeof item === 'string') {
        modelIds.push(item);
      }
    }
  }

  if (modelIds.length === 0) {
    // If no models parsed but request succeeded, return reasonable fallback
    return ['GigaChat-2', 'GigaChat-Plus', 'GigaChat-Pro'];
  }

  return modelIds;
}

/**
 * Send chat completion request to GigaChat API
 * POST https://api.giga.chat/v1/chat/completions
 */
export async function sendChatCompletion({
  accessToken,
  model,
  messages,
  temperature = 0.7,
  systemPrompt,
  mode = 'proxy',
}: ChatCompletionParams): Promise<{ content: string; model: string }> {
  const cleanToken = sanitizeToken(accessToken);
  if (!cleanToken) {
    throw new Error('Для отправки сообщения требуется Access Token. Откройте Настройки и введите токен.');
  }

  // Prepare messages array
  const formattedMessages: ChatMessagePayload[] = [];

  if (systemPrompt && systemPrompt.trim()) {
    formattedMessages.push({
      role: 'system',
      content: systemPrompt.trim(),
    });
  }

  for (const m of messages) {
    if (m.content && m.content.trim()) {
      formattedMessages.push({
        role: m.role,
        content: m.content,
      });
    }
  }

  if (formattedMessages.length === 0) {
    throw new Error('Нельзя отправить пустой запрос.');
  }

  const payload = {
    model: model || 'GigaChat-2',
    messages: formattedMessages,
    temperature: typeof temperature === 'number' ? Math.max(0, Math.min(2, temperature)) : 0.7,
  };

  const primaryUrl = mode === 'direct'
    ? `${GIGACHAT_DIRECT_BASE_URL}/v1/chat/completions`
    : `${GIGACHAT_PROXY_BASE_URL}/v1/chat/completions`;

  const fallbackUrl = mode === 'direct'
    ? `${GIGACHAT_PROXY_BASE_URL}/v1/chat/completions`
    : `${GIGACHAT_DIRECT_BASE_URL}/v1/chat/completions`;

  let response: Response;
  try {
    response = await fetch(primaryUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${cleanToken}`,
      },
      body: JSON.stringify(payload),
    });
  } catch (err: any) {
    // If primary failed due to CORS / NetworkError, attempt fallback
    try {
      response = await fetch(fallbackUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${cleanToken}`,
        },
        body: JSON.stringify(payload),
      });
    } catch {
      throw new Error(formatGigaChatError(err));
    }
  }

  if (!response.ok) {
    let errorDetail = '';
    try {
      const errJson = await response.json();
      errorDetail = errJson.message || errJson.error?.message || errJson.description || '';
    } catch {
      // response might not be json
    }

    const err = {
      status: response.status,
      statusText: response.statusText,
      details: errorDetail,
      message: `API вернул HTTP ${response.status}`,
    };
    throw new Error(formatGigaChatError(err));
  }

  let resultData: any;
  try {
    resultData = await response.json();
  } catch {
    throw new Error('API вернул нечитаемый ответ.');
  }

  const choiceContent = resultData?.choices?.[0]?.message?.content;

  if (typeof choiceContent !== 'string') {
    throw new Error('GigaChat API вернул пустой или непредвиденный формат ответа.');
  }

  return {
    content: choiceContent,
    model: resultData.model || model,
  };
}
