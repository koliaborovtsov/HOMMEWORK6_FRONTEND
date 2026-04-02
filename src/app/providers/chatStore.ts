import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Chat, Message, ChatState } from '../types';

interface ChatStore extends ChatState {
  createChat: (initialMessage?: string) => string;
  updateChat: (id: string, updates: Partial<Chat>) => void;
  deleteChat: (id: string) => void;
  setActiveChat: (id: string | null) => void;
  addMessage: (chatId: string, message: Message) => void;
  updateLastMessage: (chatId: string, content: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setStreaming: (streaming: boolean) => void;
  generateChatTitle: (chatId: string, firstMessage: string) => void;
}

const generateId = () => Date.now().toString() + Math.random().toString(36).substr(2, 9);

const createDefaultChat = (title?: string): Chat => ({
  id: generateId(),
  title: title || 'Новый чат',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  messages: [],
});

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      chats: [],
      activeChatId: null,
      isLoading: false,
      error: null,
      isStreaming: false,

      createChat: (initialMessage?: string) => {
        const title = initialMessage 
          ? initialMessage.slice(0, 40) + (initialMessage.length > 40 ? '...' : '')
          : 'Новый чат';
        const newChat = createDefaultChat(title || 'Новый чат');
        
        if (initialMessage) {
          newChat.messages.push({
            id: generateId(),
            role: 'user',
            content: initialMessage,
            timestamp: Date.now(),
          });
        }
        
        set((state) => ({
          chats: [newChat, ...state.chats],
          activeChatId: newChat.id,
        }));
        
        return newChat.id;
      },

      updateChat: (id, updates) => {
        set((state) => ({
          chats: state.chats.map((chat) =>
            chat.id === id ? { ...chat, ...updates, updatedAt: Date.now() } : chat
          ),
        }));
      },

      deleteChat: (id) => {
        set((state) => {
          const newChats = state.chats.filter((chat) => chat.id !== id);
          const newActiveId = state.activeChatId === id 
            ? (newChats[0]?.id || null)
            : state.activeChatId;
          
          return {
            chats: newChats,
            activeChatId: newActiveId,
          };
        });
      },

      setActiveChat: (id) => {
        set({ activeChatId: id });
      },

      addMessage: (chatId, message) => {
        set((state) => ({
          chats: state.chats.map((chat) =>
            chat.id === chatId
              ? {
                  ...chat,
                  messages: [...chat.messages, message],
                  updatedAt: Date.now(),
                }
              : chat
          ),
        }));
      },

      updateLastMessage: (chatId, content) => {
        set((state) => ({
          chats: state.chats.map((chat) => {
            if (chat.id !== chatId) return chat;
            const messages = [...chat.messages];
            if (messages.length > 0 && messages[messages.length - 1].role === 'assistant') {
              messages[messages.length - 1] = {
                ...messages[messages.length - 1],
                content,
              };
            }
            return { ...chat, messages, updatedAt: Date.now() };
          }),
        }));
      },

      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      setStreaming: (streaming) => set({ isStreaming: streaming }),

      generateChatTitle: (chatId, firstMessage) => {
        const title = firstMessage.slice(0, 40) + (firstMessage.length > 40 ? '...' : '');
        if (title && title.length > 3) {
          get().updateChat(chatId, { title });
        }
      },
    }),
    {
      name: 'gigachat-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        chats: state.chats,
        activeChatId: state.activeChatId,
      }),
    }
  )
);