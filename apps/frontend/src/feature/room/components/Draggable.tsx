import { ReactNode } from 'react';
import { cn } from '@/shared/lib/utils';
import { useDraggable } from '../hooks/useDraggable';

export function Draggable({ children, className }: { children: ReactNode; className?: string }) {
  const { handlers } = useDraggable();

  return (
    <div
      className={cn('absolute right-4 bottom-4 cursor-move touch-none select-none', className)}
      {...handlers}
    >
      {children}
    </div>
  );
}
