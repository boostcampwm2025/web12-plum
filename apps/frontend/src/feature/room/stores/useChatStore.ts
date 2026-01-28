import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { ChatMessage, EndQnaPayload } from '@plum/shared-interfaces';

export type ChatMessageItem = ChatMessage & {
  type: 'chat';
};

export type QnaResultItem = EndQnaPayload & {
  type: 'qna-result';
  timestamp: number;
};

export type ChatItem = ChatMessageItem | QnaResultItem;

const compareByTimestamp = (a: ChatItem, b: ChatItem) => {
  if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp;
  if (a.type !== b.type) {
    return a.type === 'qna-result' ? -1 : 1;
  }
  if (a.type === 'chat' && b.type === 'chat') {
    return a.messageId.localeCompare(b.messageId);
  }
  if (a.type === 'qna-result' && b.type === 'qna-result') {
    return a.qnaId.localeCompare(b.qnaId);
  }
  return 0;
};

const getLastChatIdFromSorted = (items: ChatItem[]) =>
  items.findLast((item) => item.type === 'chat')?.messageId ?? null;

const sortChatItems = (items: ChatItem[]) => {
  const nextItems = items.slice();
  nextItems.sort(compareByTimestamp);
  return nextItems;
};

interface ChatState {
  items: ChatItem[];
  lastMessageId: string | null;
  actions: {
    addQnaResult: (payload: EndQnaPayload) => void;
    addChat: (payload: ChatMessage) => void;
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
        addQnaResult: (payload) => {
          set((state) => ({
            items: [
              ...state.items,
              {
                ...payload,
                type: 'qna-result',
                timestamp: Date.now(),
              },
            ],
          }));
        },
        addChat: (payload) => {
          set((state) => {
            // 중복 방지
            if (
              state.items.some(
                (item): item is ChatMessageItem =>
                  item.type === 'chat' && item.messageId === payload.messageId,
              )
            ) {
              return state;
            }
            const nextItems = sortChatItems([
              ...state.items,
              {
                ...payload,
                type: 'chat',
              },
            ]);
            return {
              items: nextItems,
              lastMessageId: getLastChatIdFromSorted(nextItems),
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
