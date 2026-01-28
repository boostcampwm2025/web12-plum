import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { SidePanelHeader, SidePanelContent } from './SidePanel';
import { useChatStore } from '../stores/useChatStore';
import { useSocketStore } from '@/store/useSocketStore';
import { Icon } from '@/shared/components/icon/Icon';
import { cn } from '@/shared/lib/utils';
import { logger } from '@/shared/lib/logger';
import { Button } from '@/shared/components/Button';

const RATE_LIMIT_COOLDOWN = 3000;
const MAX_CHAT_LENGTH = 60;
const INPUT_LINE_HEIGHT = 20;
const INPUT_PADDING_Y = 16;
const INPUT_MAX_LINES = 3;
const INPUT_MAX_HEIGHT = INPUT_LINE_HEIGHT * INPUT_MAX_LINES + INPUT_PADDING_Y;
const SCROLL_BOTTOM_THRESHOLD = 8;

const formatTime = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

interface ChatPanelProps {
  onClose: () => void;
}

export function ChatPanel({ onClose }: ChatPanelProps) {
  const items = useChatStore((state) => state.items);
  const [expandedQnaIds, setExpandedQnaIds] = useState<Record<string, boolean>>({});
  const [newItemPreview, setNewItemPreview] = useState<{
    type: 'chat' | 'qna';
    name?: string;
    text: string;
  } | null>(null);
  const [hasNewItems, setHasNewItems] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollElRef = useRef<HTMLElement | null>(null);
  const isAtBottomRef = useRef(true);

  const toggleOpen = (id: string) => {
    setExpandedQnaIds((state) => ({ ...state, [id]: !state[id] }));
  };

  const scrollToBottom = useCallback(() => {
    const scrollEl = scrollElRef.current;
    if (!scrollEl) return;
    scrollEl.scrollTop = scrollEl.scrollHeight;
    setHasNewItems(false);
    setNewItemPreview(null);
  }, []);

  useEffect(() => {
    const scrollEl = contentRef.current?.parentElement;
    if (!scrollEl) return;

    scrollElRef.current = scrollEl;
    scrollEl.scrollTop = scrollEl.scrollHeight;

    const handleScroll = () => {
      isAtBottomRef.current =
        scrollEl.scrollTop + scrollEl.clientHeight >=
        scrollEl.scrollHeight - SCROLL_BOTTOM_THRESHOLD;
      if (isAtBottomRef.current) {
        setHasNewItems(false);
        setNewItemPreview(null);
      }
    };

    scrollEl.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => {
      scrollEl.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    if (isAtBottomRef.current) {
      scrollToBottom();
      return;
    }
    const latestItem = items[items.length - 1];
    if (!latestItem) return;
    if (latestItem.type === 'chat') {
      setNewItemPreview({
        type: 'chat',
        name: latestItem.senderName,
        text: latestItem.text,
      });
    } else {
      setNewItemPreview({
        type: 'qna',
        text: latestItem.title,
      });
    }
    setHasNewItems(true);
  }, [items, scrollToBottom]);

  return (
    <>
      <SidePanelHeader
        title="채팅"
        onClose={onClose}
      />
      <SidePanelContent>
        <div
          ref={contentRef}
          className="flex flex-1 flex-col px-4"
        >
          {items.map((item) => {
            if (item.type === 'qna-result') {
              const isExpanded = expandedQnaIds[item.qnaId] ?? false;

              return (
                <div
                  key={item.qnaId}
                  className="text-text my-1.5 rounded-xl bg-gray-400 px-3 py-2"
                >
                  <button
                    type="button"
                    className="flex w-full cursor-pointer items-center justify-between text-left"
                    onClick={() => toggleOpen(item.qnaId)}
                    aria-expanded={isExpanded}
                  >
                    <div className="flex flex-col gap-1">
                      <span className="font-bold">{item.title}</span>
                      <span className="text-subtext text-xs font-bold">
                        총 답변 수 {item.text?.length ?? item.count}개
                      </span>
                    </div>
                    <Icon
                      name="chevron"
                      size={20}
                      className={cn(
                        'text-text transition-transform duration-200 ease-in-out',
                        isExpanded ? 'rotate-180' : 'rotate-0',
                      )}
                      decorative
                    />
                  </button>
                  <motion.div
                    initial={false}
                    animate={{
                      gridTemplateRows: isExpanded ? '1fr' : '0fr',
                      marginTop: isExpanded ? '0.75rem' : '0rem',
                    }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="grid overflow-hidden"
                  >
                    <div className="max-h-88 min-h-0 overflow-y-auto">
                      <ul className="marker:text-primary flex list-disc flex-col gap-2 pl-5 text-sm text-white/90">
                        {(item.text ?? []).map((answer, index) => (
                          <li key={`${item.qnaId}-${index}`}>{answer}</li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                </div>
              );
            }

            if (item.type === 'chat') {
              return (
                <div
                  key={item.messageId}
                  className="flex flex-col gap-1 py-1.5"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-primary text-sm font-bold">{item.senderName}</span>
                    <span className="text-subtext text-xs font-normal">
                      {formatTime(item.timestamp)}
                    </span>
                  </div>
                  <span className="text-text text-sm wrap-break-word whitespace-pre-wrap">
                    {item.text}
                  </span>
                </div>
              );
            }

            return null;
          })}
        </div>
      </SidePanelContent>
      <ChatInput
        hasNewItems={hasNewItems}
        newItemPreview={newItemPreview}
        onScrollToBottom={scrollToBottom}
      />
    </>
  );
}

interface ChatInputProps {
  hasNewItems: boolean;
  newItemPreview: {
    type: 'chat' | 'qna';
    name?: string;
    text: string;
  } | null;
  onScrollToBottom: () => void;
}

function ChatInput({ hasNewItems, newItemPreview, onScrollToBottom }: ChatInputProps) {
  const emit = useSocketStore((state) => state.actions.emit);
  const [text, setText] = useState('');
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [chatToast, setChatToast] = useState<string | null>(null);
  const rateLimitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    return () => {
      if (rateLimitTimerRef.current) clearTimeout(rateLimitTimerRef.current);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const startRateLimitCooldown = useCallback(() => {
    setIsRateLimited(true);
    rateLimitTimerRef.current = setTimeout(() => {
      setIsRateLimited(false);
      rateLimitTimerRef.current = null;
    }, RATE_LIMIT_COOLDOWN);
  }, []);

  const showChatToast = useCallback(
    (message: string) => {
      if (chatToast) return;
      setChatToast(message);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => {
        setChatToast(null);
        toastTimerRef.current = null;
      }, RATE_LIMIT_COOLDOWN);
    },
    [chatToast],
  );

  const handleSendChat = () => {
    const trimmed = text.trim();
    if (!trimmed || isRateLimited) return;

    emit('send_chat', { text: trimmed }, (response) => {
      if (!response.success) {
        logger.socket.warn('채팅 전송 실패', response.error);
        if (response.retryable === false) {
          showChatToast('너무 많은 메시지를 보냈습니다. 잠시 후 다시 시도해주세요.');
          startRateLimitCooldown();
          return;
        }
        showChatToast('채팅 전송에 실패했습니다. 잠시 후 다시 시도해주세요.');
      }
    });
    setText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSendChat();
    }
  };

  const resizeInput = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, INPUT_MAX_HEIGHT)}px`;
    el.style.overflowY = el.scrollHeight > INPUT_MAX_HEIGHT ? 'auto' : 'hidden';
  }, []);

  useEffect(() => {
    resizeInput();
  }, [text, resizeInput]);

  return (
    <div className="mt-auto border-t border-gray-200 px-4 pt-3">
      <div className="relative flex items-end gap-2">
        <AnimatePresence>
          {chatToast && (
            <motion.div
              key="chat-toast"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="text-text bg-error/80 absolute right-0 bottom-full left-0 mb-2 flex justify-center rounded-lg px-3 py-2 text-xs"
            >
              {chatToast}
            </motion.div>
          )}
        </AnimatePresence>
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => {
            const next = e.target.value;
            if (next.length > MAX_CHAT_LENGTH) {
              showChatToast(`최대 ${MAX_CHAT_LENGTH}자까지 입력할 수 있습니다.`);
              return;
            }
            setText(next);
          }}
          onKeyDown={handleKeyDown}
          placeholder="채팅 입력하기"
          rows={1}
          className="placeholder-subtext flex-1 resize-none rounded-lg bg-gray-300 px-3 py-2 text-sm text-white outline-none"
          disabled={isRateLimited}
        />
        <Button
          onClick={handleSendChat}
          className="bg-primary p-2"
        >
          <Icon
            name="send"
            size={20}
            decorative
          />
        </Button>
        {hasNewItems && newItemPreview && (
          <button
            type="button"
            onClick={onScrollToBottom}
            className="text-text absolute right-0 bottom-full left-0 mb-5 flex items-center justify-between gap-2 rounded-lg bg-gray-400 px-2 py-2 text-xs shadow"
          >
            {newItemPreview.type === 'chat' && newItemPreview.name ? (
              <div className="inline-flex min-w-0 items-center gap-2">
                <span className="text-primary text-sm font-bold">{newItemPreview.name}</span>
                <span className="truncate text-sm">{newItemPreview.text}</span>
              </div>
            ) : (
              <span className="truncate">{newItemPreview.text}</span>
            )}
            <Icon
              name="chevron"
              size={16}
            />
          </button>
        )}
      </div>
    </div>
  );
}
