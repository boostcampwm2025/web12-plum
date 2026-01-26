import { create } from 'zustand';

export type ChatItem =
  | {
      id: string;
      type: 'qna-summary';
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
  actions: {
    addQnaSummary: (title: string, answers: string[]) => void;
    addChat: (name: string, message: string) => void;
    clear: () => void;
  };
}

export const useChatStore = create<ChatState>((set) => ({
  items: [],
  actions: {
    addQnaSummary: (title, answers) => {
      const id = `qna-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      set((state) => ({
        items: [
          ...state.items,
          {
            id,
            type: 'qna-summary',
            title,
            answers,
            createdAt: Date.now(),
          },
        ],
      }));
    },
    addChat: (name, message) => {
      const id = `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      set((state) => ({
        items: [
          ...state.items,
          {
            id,
            type: 'chat',
            name,
            message,
            createdAt: Date.now(),
          },
        ],
      }));
    },
    clear: () => set({ items: [] }),
  },
}));
