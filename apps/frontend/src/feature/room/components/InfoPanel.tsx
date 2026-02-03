import { useEffect } from 'react';
import { SidePanelHeader, SidePanelContent } from './SidePanel';
import { Button } from '@/shared/components/Button';
import { Icon } from '@/shared/components/icon/Icon';
import { Toggle } from '@/shared/components/Toggle';
import { logger } from '@/shared/lib/logger';
import { useRoomPresentation } from '../hooks/useRoomPresentation';
import { useToastStore } from '@/store/useToastStore';
import {
  useBackgroundEffectStore,
  type BackgroundEffectMode,
} from '../stores/useBackgroundEffectStore';
import { useSoundStore } from '@/store/useSoundStore';
import { Select, type SelectOption } from '@/shared/components/Select';

const BACKGROUND_EFFECT_OPTIONS: SelectOption<BackgroundEffectMode>[] = [
  { label: '블러', value: 'blur' },
  { label: '플럼 배경', value: 'image' },
  { label: '처리 안함', value: 'off' },
];

interface InfoPanelProps {
  joinLink: string;
  onClose: () => void;
}

export function InfoPanel({ joinLink, onClose }: InfoPanelProps) {
  const { files, isLoading, fetchPresentation } = useRoomPresentation();
  const addToast = useToastStore((state) => state.actions.addToast);
  const backgroundMode = useBackgroundEffectStore((state) => state.mode);
  const setBackgroundMode = useBackgroundEffectStore((state) => state.actions.setMode);
  const isSoundMuted = useSoundStore((state) => state.isMuted);
  const toggleSoundMuted = useSoundStore((state) => state.actions.toggleMuted);

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      addToast({ type: 'success', title: '참여 링크가 복사되었습니다.' });
    } catch (err) {
      logger.ui.error('참여 링크 복사 실패', err);
      addToast({ type: 'error', title: '참여 링크 복사에 실패했습니다.' });
    }
  };

  useEffect(() => {
    fetchPresentation();
  }, [fetchPresentation]);

  return (
    <>
      <SidePanelHeader
        title="강의 정보"
        onClose={onClose}
      />
      <SidePanelContent>
        <div className="px-4">
          <h3 className="mb-3 text-sm">참여 링크</h3>
          <div
            className="mb-6 flex items-center justify-between gap-6 rounded-lg bg-gray-400 py-1 pr-1 pl-3 text-sm"
            data-guide="info-join-link"
          >
            <span className="truncate">{joinLink}</span>
            <Button
              variant="icon"
              onClick={() => {
                copyText(joinLink);
              }}
            >
              <Icon
                name="copy"
                size={16}
              />
            </Button>
          </div>

          <h3 className="mb-3 text-sm">발표 자료</h3>
          <div
            className="mb-6"
            data-guide="info-files"
          >
            {isLoading ? (
              <p className="text-text/60 text-xs">자료를 불러오는 중...</p>
            ) : files.length === 0 ? (
              <p className="text-text/60 text-xs">업로드된 파일이 없습니다.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {files.map((file, index) => (
                  <li
                    key={index}
                    className="flex items-center justify-between rounded-lg bg-gray-400 py-1 pr-1 pl-3 text-sm"
                  >
                    {file.name}
                    <Button
                      variant="icon"
                      as="a"
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Icon
                        name="download"
                        size={16}
                      />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <h3 className="mb-3 text-sm">배경 효과</h3>
          <div
            className="mb-6"
            data-guide="info-background"
          >
            <Select
              value={backgroundMode}
              onChange={setBackgroundMode}
              options={BACKGROUND_EFFECT_OPTIONS}
              aria-label="배경 효과 선택"
            />
          </div>

          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-text text-sm">
              <label htmlFor="interaction-sound-mute">인터렉션 사운드</label>
            </h3>

            <Toggle
              id="interaction-sound-mute"
              checked={isSoundMuted}
              onChange={toggleSoundMuted}
              size="sm"
            />
          </div>
        </div>
      </SidePanelContent>
    </>
  );
}
