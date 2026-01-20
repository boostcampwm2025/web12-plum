import { useEffect, useState } from 'react';
import { Icon } from '@/shared/components/icon/Icon';
import { cn } from '@/shared/lib/utils';

interface TimeLeftProps {
  timeLimitSeconds: number;
  startedAt: number;
  className?: string;
  iconSize?: number;
}

function formatSeconds(totalSeconds: number) {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function getRemainingSeconds(timeLimitSeconds: number, startedAt: number) {
  const remainingMs = timeLimitSeconds * 1000 - (Date.now() - startedAt);
  return Math.max(0, Math.ceil(remainingMs / 1000));
}

export function TimeLeft({ timeLimitSeconds, startedAt, className, iconSize = 16 }: TimeLeftProps) {
  const [remainingSeconds, setRemainingSeconds] = useState(() =>
    getRemainingSeconds(timeLimitSeconds, startedAt),
  );

  useEffect(() => {
    const intervalId = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev === 0) {
          clearInterval(intervalId);
          return prev;
        }
        return getRemainingSeconds(timeLimitSeconds, startedAt);
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [timeLimitSeconds, startedAt]);

  return (
    <div
      className={cn(
        'text-text/60 flex w-full items-center justify-center gap-2 text-sm',
        className,
      )}
    >
      <Icon
        name="timer"
        size={iconSize}
      />
      {formatSeconds(remainingSeconds)}
    </div>
  );
}
