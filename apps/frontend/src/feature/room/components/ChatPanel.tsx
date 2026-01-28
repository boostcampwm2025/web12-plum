import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { SidePanelHeader, SidePanelContent } from './SidePanel';
import { useChatStore } from '../stores/useChatStore';
import { useSocketStore } from '@/store/useSocketStore';
import { Icon } from '@/shared/components/icon/Icon';
import { cn } from '@/shared/lib/utils';
import { logger } from '@/shared/lib/logger';
import { Button } from '@/shared/components/Button';

const RATE_LIMIT_COOLDOWN = 3000;

interface ChatPanelProps {
  onClose: () => void;
}

export function ChatPanel({ onClose }: ChatPanelProps) {
  const items = useChatStore((state) => state.items);
  const emit = useSocketStore((state) => state.actions.emit);
  const [expandedQnaIds, setExpandedQnaIds] = useState<Record<string, boolean>>({});
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [chatToast, setChatToast] = useState<string | null>(null);
  const rateLimitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollElRef = useRef<HTMLElement | null>(null);
  const isAtBottomRef = useRef(true);
  const toggleOpen = (id: string) => {
    setExpandedQnaIds((state) => ({ ...state, [id]: !state[id] }));
  };

  const startRateLimitCooldown = useCallback(() => {
    setIsRateLimited(true);
    rateLimitTimerRef.current = setTimeout(() => {
      setIsRateLimited(false);
      rateLimitTimerRef.current = null;
    }, RATE_LIMIT_COOLDOWN);
  }, []);

  useEffect(() => {
    return () => {
      if (rateLimitTimerRef.current) {
        clearTimeout(rateLimitTimerRef.current);
      }
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const isInputDisabled = isSending || isRateLimited;

  const handleSendChat = () => {
    const trimmed = text.trim();
    if (!trimmed || isInputDisabled) return;

    setIsSending(true);
    emit('send_chat', { text: trimmed }, (response) => {
      setIsSending(false);
      if (!response.success) {
        logger.socket.warn('채팅 전송 실패', response.error);
        setChatToast(response.error ?? '잠시 후 다시 시도해주세요.');
        if (toastTimerRef.current) {
          clearTimeout(toastTimerRef.current);
        }
        toastTimerRef.current = setTimeout(() => {
          setChatToast(null);
          toastTimerRef.current = null;
        }, RATE_LIMIT_COOLDOWN);

        if (response.retryable === false) {
          startRateLimitCooldown();
        }
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
    const lineHeight = 20;
    const paddingY = 16;
    const maxHeight = lineHeight * 3 + paddingY;
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, []);

  useEffect(() => {
    resizeInput();
  }, [text, resizeInput]);

  useEffect(() => {
    const scrollEl = contentRef.current?.parentElement;
    if (!scrollEl) return;

    scrollElRef.current = scrollEl;
    const handleScroll = () => {
      const threshold = 8;
      isAtBottomRef.current =
        scrollEl.scrollTop + scrollEl.clientHeight >= scrollEl.scrollHeight - threshold;
    };

    scrollEl.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => {
      scrollEl.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const formatTime = (timestamp: number) =>
    new Date(timestamp).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

  useEffect(() => {
    (window as any).sendChatFromConsole = (message: string) => {
      const trimmed = message.trim();
      if (!trimmed) return;
      emit('send_chat', { text: trimmed }, (response) => {
        if (!response.success) {
          logger.socket.warn('채팅 전송 실패', response.error);
        }
      });
    };

    return () => {
      delete (window as any).sendChatFromConsole;
    };
  }, [emit]);

  useEffect(() => {
    const scrollEl = scrollElRef.current;
    if (!scrollEl || !isAtBottomRef.current) return;
    scrollEl.scrollTop = scrollEl.scrollHeight;
  }, [items]);

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
              const isExpanded = expandedQnaIds[item.qnaId] ?? true;

              return (
                <div
                  key={item.qnaId}
                  className="my-1.5 rounded-2xl bg-[#343451] px-4 py-3 text-white"
                >
                  <button
                    type="button"
                    className="flex w-full cursor-pointer items-center justify-between text-left"
                    onClick={() => toggleOpen(item.qnaId)}
                    aria-expanded={isExpanded}
                  >
                    <div className="flex flex-col gap-1">
                      <span className="font-bold">{item.title}</span>
                      <span className="text-xs font-semibold text-white/50">
                        총 답변 수 {item.text?.length ?? item.count}개
                      </span>
                    </div>
                    <Icon
                      name="chevron"
                      size={20}
                      className={cn(
                        'text-white/70 transition-transform duration-200 ease-in-out',
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
      <div className="mt-auto flex flex-col gap-2 border-t border-gray-200 px-4 pt-3">
        {chatToast && (
          <div className="rounded-xl bg-white/10 px-3 py-2 text-xs text-white/80">{chatToast}</div>
        )}
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="채팅 입력하기"
            maxLength={60}
            rows={1}
            className="placeholder-subtext flex-1 resize-none rounded-lg bg-gray-300 px-3 py-2 text-sm text-white outline-none"
            disabled={isInputDisabled}
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
        </div>
      </div>
    </>
  );
}
