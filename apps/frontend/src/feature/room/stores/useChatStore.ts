import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type ChatItem =
  | {
      id: string;
      type: 'qna-result';
      title: string;
      answers: string[];
      createdAt: number;
    }
  | {
      id: string;
      type: 'chat';
      name: string;
      message: string;
      createdAt: number;
    };

interface ChatState {
  items: ChatItem[];
  lastMessageId: string | null;
  actions: {
    addQnaResult: (title: string, answers: string[]) => void;
    addChat: (messageId: string, name: string, message: string, timestamp: number) => void;
    getLastMessageId: () => string | null;
    clear: () => void;
  };
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      items: [],
      lastMessageId: null,
      actions: {
        addQnaResult: (title, answers) => {
          const id = `qna-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          set((state) => ({
            items: [
              ...state.items,
              {
                id,
                type: 'qna-result',
                title,
                answers,
                createdAt: Date.now(),
              },
            ],
          }));
        },
        addChat: (messageId, name, message, timestamp) => {
          set((state) => {
            // 중복 방지
            if (state.items.some((item) => item.id === messageId)) {
              return state;
            }
            return {
              items: [
                ...state.items,
                {
                  id: messageId,
                  type: 'chat',
                  name,
                  message,
                  createdAt: timestamp,
                },
              ],
              lastMessageId: messageId,
            };
          });
        },
        getLastMessageId: () => get().lastMessageId,
        clear: () => set({ items: [], lastMessageId: null }),
      },
    }),
    {
      name: 'room-chat',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        items: state.items.filter((item) => item.type === 'qna-result'),
      }),
    },
  ),
);
