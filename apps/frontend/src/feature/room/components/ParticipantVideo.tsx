import { useState } from 'react';
import { cn } from '@/shared/lib/utils';
import { Icon } from '@/shared/components/icon/Icon';
import { Button } from '@/shared/components/Button';

export type VideoDisplayMode = 'minimize' | 'pip' | 'side';

export interface ParticipantVideoProps {
  id: string;
  name: string;
  mode: VideoDisplayMode;
  isCurrentUser?: boolean;
  onModeChange?: (mode: VideoDisplayMode) => void;
}

export function ParticipantVideo({
  name,
  mode,
  isCurrentUser = false,
  onModeChange,
}: ParticipantVideoProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Minimize 모드
  if (mode === 'minimize') {
    return (
      <div className="relative flex w-50.5 items-center justify-between overflow-hidden rounded-lg bg-gray-500 px-2 shadow-md">
        <span className="px-1 text-sm font-medium text-white">{name}</span>

        {isCurrentUser && (
          <Button
            variant="icon"
            onClick={() => onModeChange?.('pip')}
            aria-label="확대"
          >
            <Icon
              name="maximize"
              size={16}
            />
          </Button>
        )}
      </div>
    );
  }

  // PIP, Side 모드
  return (
    <div
      className={cn(
        'relative h-28.5 w-50.5 overflow-hidden rounded-lg',
        mode === 'pip' && 'shadow-md',
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex h-full w-full items-center justify-center bg-gray-200" />

      <div className="absolute bottom-2 left-2 rounded px-1 text-sm text-white">{name}</div>

      {isHovered && isCurrentUser && (
        <div className={cn('absolute inset-0 bg-gray-700/40')}>
          {mode === 'pip' && (
            <>
              <Button
                variant="icon"
                className="absolute top-2 left-2"
                onClick={() => onModeChange?.('minimize')}
                aria-label="최소화"
              >
                <Icon
                  name="minimize"
                  size={20}
                />
              </Button>
              <Button
                variant="icon"
                className="absolute top-2 right-2"
                onClick={() => onModeChange?.('side')}
                aria-label="사이드바로 이동"
              >
                <Icon
                  name="side-open"
                  size={20}
                />
              </Button>
            </>
          )}

          {mode === 'side' && (
            <Button
              variant="icon"
              className="absolute top-2 right-2"
              onClick={() => onModeChange?.('pip')}
              aria-label="PIP 모드로 전환"
            >
              <Icon
                name="pip"
                size={20}
              />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
