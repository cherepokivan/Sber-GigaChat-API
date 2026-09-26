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

export const GIGACHAT_BASE_URL = 'https://api.giga.chat';

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
 * Normalizes HTTP/Fetch errors into human-friendly Russian messages
 */
export function formatGigaChatError(error: any): string {
  if (!error) return 'Неизвестная ошибка при обращении к GigaChat API.';

  // If already customized message
  if (typeof error === 'string') return error;

  const status = error.status || error.statusCode;

  if (status === 401) {
    return 'Access Token недействителен или истёк. Вставьте новый токен в настройках.';
  }
  if (status === 403) {
    return 'Доступ запрещен (HTTP 403). Проверьте права и тариф вашего аккаунта GigaChat.';
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
    return 'GigaChat API не разрешил прямой запрос из браузера (CORS / сетевая ошибка). Убедитесь в наличии интернет-соединения и отсутствии блокировок.';
  }

  return error.message || 'Ошибка соединения с GigaChat API.';
}

/**
 * Fetch available models from GigaChat API
 * GET https://api.giga.chat/v1/models
 */
export async function getModels(accessToken: string): Promise<string[]> {
  const cleanToken = accessToken ? accessToken.trim() : '';
  if (!cleanToken) {
    throw new Error('Токен доступа (Access Token) не указан.');
  }

  let response: Response;
  try {
    response = await fetch(`${GIGACHAT_BASE_URL}/v1/models`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${cleanToken}`,
      },
    });
  } catch (err: any) {
    const errorMsg = formatGigaChatError(err);
    throw new Error(errorMsg);
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
}: ChatCompletionParams): Promise<{ content: string; model: string }> {
  const cleanToken = accessToken ? accessToken.trim() : '';
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

  let response: Response;
  try {
    response = await fetch(`${GIGACHAT_BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${cleanToken}`,
      },
      body: JSON.stringify(payload),
    });
  } catch (err: any) {
    throw new Error(formatGigaChatError(err));
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
