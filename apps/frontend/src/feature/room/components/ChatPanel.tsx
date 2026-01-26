import { useState } from 'react';
import { motion } from 'motion/react';
import { SidePanelHeader, SidePanelContent } from './SidePanel';
import { useChatStore } from '../stores/useChatStore';
import { Icon } from '@/shared/components/icon/Icon';
import { cn } from '@/shared/lib/utils';

interface ChatPanelProps {
  onClose: () => void;
}

export function ChatPanel({ onClose }: ChatPanelProps) {
  const items = useChatStore((state) => state.items);
  const [expandedQnaIds, setExpandedQnaIds] = useState<Record<string, boolean>>({});

  const toggleOpen = (id: string) => {
    setExpandedQnaIds((state) => ({ ...state, [id]: !state[id] }));
  };

  // TODO: 시간 순 정렬
  // TODO: 가상화 처리

  return (
    <>
      <SidePanelHeader
        title="채팅"
        onClose={onClose}
      />
      <SidePanelContent>
        <div className="flex flex-1 flex-col gap-3 px-3 pb-4">
          {items.map((item) => {
            if (item.type !== 'qna-result') return null;
            const isExpanded = expandedQnaIds[item.id] ?? true;

            return (
              <div
                key={item.id}
                className="rounded-2xl bg-gray-400 px-4 py-3 text-white"
              >
                <button
                  type="button"
                  className="flex w-full cursor-pointer items-center justify-between text-left"
                  onClick={() => toggleOpen(item.id)}
                  aria-expanded={isExpanded}
                >
                  <div className="flex flex-col gap-1">
                    <span className="font-bold">{item.title}</span>
                    <span className="text-subtext text-xs font-bold">
                      총 답변 수 {item.answers.length}개
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
                      {item.answers.map((answer, index) => (
                        <li key={`${item.id}-${index}`}>{answer}</li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              </div>
            );
          })}
        </div>
      </SidePanelContent>
    </>
  );
}
