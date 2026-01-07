import { ReactNode } from 'react';
import { cn } from '@/shared/lib/utils';

interface TooltipProps {
  content: string;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export default function Tooltip({ content, children, position = 'top' }: TooltipProps) {
  const positionStyles = {
    top: 'bottom-full left-1/2 mb-2 -translate-x-1/2',
    bottom: 'top-full left-1/2 mt-2 -translate-x-1/2',
    left: 'right-full top-1/2 mr-2 -translate-y-1/2',
    right: 'left-full top-1/2 ml-2 -translate-y-1/2',
  };

  return (
    <div className="group relative inline-flex">
      {children}
      <div
        className={cn(
          'text-text pointer-events-none absolute z-50 scale-75 rounded bg-gray-200 px-2 py-1 text-xs font-normal whitespace-nowrap opacity-0 transition-all duration-200 group-hover:scale-100 group-hover:opacity-100',
          positionStyles[position],
        )}
      >
        {content}
      </div>
    </div>
  );
}
