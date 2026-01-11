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
  return (
    <div
      className={cn(
        'relative w-50.5 overflow-hidden rounded-lg transition-[height] duration-300 ease-in-out',
        isCurrentUser && 'group',
        mode === 'minimize'
          ? 'flex h-9 items-center justify-between bg-gray-500 px-2 shadow-md'
          : 'h-28.5',
        mode === 'pip' && 'shadow-md',
      )}
    >
      {/* 비디오 영역 */}
      {mode !== 'minimize' && <div className="h-full w-full bg-gray-200" />}

      {/* 이름 표시 */}
      <div className="absolute bottom-2 left-2 rounded px-1 text-sm text-white">{name}</div>

      {/* minimize 모드 확대 버튼 */}
      {mode === 'minimize' && isCurrentUser && (
        <Button
          variant="icon"
          className="absolute top-1/2 right-2 -translate-y-1/2"
          onClick={() => onModeChange?.('pip')}
          aria-label="확대"
        >
          <Icon
            name="maximize"
            size={16}
          />
        </Button>
      )}

      {/* 호버 컨트롤 (pip, side 모드) */}
      {mode !== 'minimize' && isCurrentUser && (
        <div
          className={cn(
            'absolute inset-0 bg-gray-700/40 transition-opacity duration-300',
            'pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100',
          )}
        >
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
