import { motion } from 'motion/react';
import { ReactNode } from 'react';
import { Icon } from '@/shared/components/icon/Icon';
import { Button } from '@/shared/components/Button';
import { cn } from '@/shared/lib/utils';

export interface SidePanelProps {
  children: ReactNode;
}

export function SidePanel({ children }: SidePanelProps) {
  return (
    <motion.aside
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{
        duration: 0.3,
        ease: 'easeInOut',
      }}
      className="ml-4 flex h-full w-90 flex-col gap-3 rounded-2xl bg-gray-500 py-4 text-white"
    >
      {children}
    </motion.aside>
  );
}

interface SidePanelHeaderProps {
  title: string;
  onClose: () => void;
  onBack?: () => void;
}

export function SidePanelHeader({ title, onClose, onBack }: SidePanelHeaderProps) {
  return (
    <div className="flex items-center justify-between pr-2">
      <div className="flex items-center gap-3 pl-2">
        {onBack && (
          <Button
            variant="icon"
            onClick={onBack}
            aria-label="뒤로가기"
            className="text-white hover:bg-gray-600"
          >
            <Icon
              name="chevron"
              size={24}
              className="rotate-90"
            />
          </Button>
        )}
        <h2 className={cn('text-md font-bold', !onBack && 'pl-2')}>{title}</h2>
      </div>
      <Button
        variant="icon"
        onClick={onClose}
        aria-label="닫기"
        className="text-white hover:bg-gray-600"
      >
        <Icon
          name="x"
          size={24}
        />
      </Button>
    </div>
  );
}

interface SidePanelContentProps {
  children: ReactNode;
}

export function SidePanelContent({ children }: SidePanelContentProps) {
  return <div className="flex flex-col overflow-y-auto">{children}</div>;
}
