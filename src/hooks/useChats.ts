/**
 * GigaChat Open Client - useChats hook
 * Manages chat list, active chat session, messages, persistence, and auto-titling.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ChatSession,
  MessageItem,
  getStoredChats,
  saveStoredChats,
  getActiveChatId,
  saveActiveChatId,
} from '../lib/storage';

export function createEmptyChatSession(): ChatSession {
  const now = Date.now();
  const id = 'chat_' + Math.random().toString(36).substring(2, 9) + '_' + now;
  return {
    id,
    title: 'Новый чат',
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function truncateTitle(text: string, maxLength: number = 40): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLength) return clean;
  return clean.slice(0, maxLength).trim() + '…';
}

export function useChats() {
  const [chats, setChats] = useState<ChatSession[]>(() => {
    const stored = getStoredChats();
    if (stored.length > 0) return stored;
    const initial = createEmptyChatSession();
    return [initial];
  });

  const [activeChatId, setActiveChatId] = useState<string>(() => {
    const storedActive = getActiveChatId();
    if (storedActive && chats.some(c => c.id === storedActive)) {
      return storedActive;
    }
    return chats[0]?.id || '';
  });

  // Ensure active chat exists or fallback to first
  useEffect(() => {
    if (!chats.some(c => c.id === activeChatId)) {
      if (chats.length > 0) {
        setActiveChatId(chats[0].id);
        saveActiveChatId(chats[0].id);
      } else {
        const fresh = createEmptyChatSession();
        setChats([fresh]);
        setActiveChatId(fresh.id);
        saveActiveChatId(fresh.id);
      }
    }
  }, [chats, activeChatId]);

  // Persist chats on changes
  useEffect(() => {
    saveStoredChats(chats);
  }, [chats]);

  // Persist activeChatId
  useEffect(() => {
    if (activeChatId) {
      saveActiveChatId(activeChatId);
    }
  }, [activeChatId]);

  const activeChat = useMemo(() => {
    return chats.find(c => c.id === activeChatId) || chats[0] || null;
  }, [chats, activeChatId]);

  // Create new chat
  const createNewChat = useCallback(() => {
    const newChat = createEmptyChatSession();
    setChats(prev => [newChat, ...prev]);
    setActiveChatId(newChat.id);
    return newChat.id;
  }, []);

  // Delete chat
  const deleteChat = useCallback((id: string) => {
    setChats(prev => {
      const remaining = prev.filter(c => c.id !== id);
      if (remaining.length === 0) {
        const fresh = createEmptyChatSession();
        setActiveChatId(fresh.id);
        return [fresh];
      }
      return remaining;
    });

    // If deleting active chat, select next available
    setActiveChatId(currentActive => {
      if (currentActive === id) {
        const remaining = chats.filter(c => c.id !== id);
        return remaining[0]?.id || '';
      }
      return currentActive;
    });
  }, [chats]);

  // Select chat
  const selectChat = useCallback((id: string) => {
    setActiveChatId(id);
  }, []);

  // Rename chat
  const updateChatTitle = useCallback((id: string, newTitle: string) => {
    setChats(prev =>
      prev.map(chat => {
        if (chat.id === id) {
          return {
            ...chat,
            title: newTitle.trim() || 'Новый чат',
            updatedAt: Date.now(),
          };
        }
        return chat;
      })
    );
  }, []);

  // Add message to active or specified chat
  const addMessage = useCallback(
    (
      chatId: string,
      message: Omit<MessageItem, 'id' | 'time'> & { id?: string; time?: number }
    ) => {
      const fullMessage: MessageItem = {
        id: message.id || 'msg_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
        role: message.role,
        content: message.content,
        time: message.time || Date.now(),
        model: message.model,
      };

      setChats(prev =>
        prev.map(chat => {
          if (chat.id === chatId) {
            const nextMessages = [...chat.messages, fullMessage];
            // Auto-title if it was the first user message
            let nextTitle = chat.title;
            if (chat.messages.length === 0 && fullMessage.role === 'user') {
              nextTitle = truncateTitle(fullMessage.content);
            }

            return {
              ...chat,
              title: nextTitle,
              messages: nextMessages,
              updatedAt: Date.now(),
            };
          }
          return chat;
        })
      );

      return fullMessage;
    },
    []
  );

  // Update a message content (for streaming or editing)
  const updateMessage = useCallback(
    (chatId: string, messageId: string, content: string) => {
      setChats(prev =>
        prev.map(chat => {
          if (chat.id === chatId) {
            return {
              ...chat,
              messages: chat.messages.map(m =>
                m.id === messageId ? { ...m, content } : m
              ),
              updatedAt: Date.now(),
            };
          }
          return chat;
        })
      );
    },
    []
  );

  // Remove last assistant message to retry
  const removeLastAssistantMessage = useCallback((chatId: string) => {
    let lastUserQuery = '';
    setChats(prev =>
      prev.map(chat => {
        if (chat.id === chatId) {
          const msgs = [...chat.messages];
          if (msgs.length > 0 && msgs[msgs.length - 1].role === 'assistant') {
            msgs.pop();
          }
          // Find last user message
          for (let i = msgs.length - 1; i >= 0; i--) {
            if (msgs[i].role === 'user') {
              lastUserQuery = msgs[i].content;
              break;
            }
          }
          return {
            ...chat,
            messages: msgs,
            updatedAt: Date.now(),
          };
        }
        return chat;
      })
    );
    return lastUserQuery;
  }, []);

  // Replace all chats (on backup import)
  const setAllChats = useCallback((newChats: ChatSession[]) => {
    if (newChats.length === 0) {
      const fresh = createEmptyChatSession();
      setChats([fresh]);
      setActiveChatId(fresh.id);
    } else {
      setChats(newChats);
      setActiveChatId(newChats[0].id);
    }
  }, []);

  return {
    chats,
    activeChat,
    activeChatId,
    createNewChat,
    deleteChat,
    selectChat,
    updateChatTitle,
    addMessage,
    updateMessage,
    removeLastAssistantMessage,
    setAllChats,
  };
}
