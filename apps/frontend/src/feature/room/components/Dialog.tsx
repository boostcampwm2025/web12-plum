import { motion } from 'motion/react';
import { ReactNode } from 'react';
import { Icon } from '@/shared/components/icon/Icon';
import { Button } from '@/shared/components/Button';

interface DialogProps {
  title: string;
  children: ReactNode;
  onClose?: () => void;
}

export function Dialog({ title, children, onClose }: DialogProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="absolute inset-x-0 bottom-22 z-50 mx-auto flex w-lg flex-col gap-4 rounded-2xl bg-gray-500 py-4 pr-4 pl-6 shadow-lg"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">{title}</h2>
        <Button
          variant="icon"
          onClick={onClose}
          aria-label="닫기"
        >
          <Icon
            name="x"
            size={24}
          />
        </Button>
      </div>
      {children}
    </motion.div>
  );
}
