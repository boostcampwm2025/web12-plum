import { useEffect } from 'react';
import { SidePanelHeader, SidePanelContent } from './SidePanel';
import { Button } from '@/shared/components/Button';
import { Icon } from '@/shared/components/icon/Icon';
import { logger } from '@/shared/lib/logger';
import { useRoomPresentation } from '../hooks/useRoomPresentation';
import { useToastStore } from '@/store/useToastStore';
import {
  useBackgroundEffectStore,
  type BackgroundEffectMode,
} from '../stores/useBackgroundEffectStore';

interface InfoPanelProps {
  joinLink: string;
  onClose: () => void;
}

export function InfoPanel({ joinLink, onClose }: InfoPanelProps) {
  const { files, isLoading, fetchPresentation } = useRoomPresentation();
  const addToast = useToastStore((state) => state.actions.addToast);
  const backgroundMode = useBackgroundEffectStore((state) => state.mode);
  const setBackgroundMode = useBackgroundEffectStore((state) => state.actions.setMode);

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
          <div className="mb-6 flex items-center justify-between gap-6 rounded-lg bg-gray-400 py-1 pr-1 pl-3 text-sm">
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
          <div className="mb-6">
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
          <div className="mb-6">
            {/*TODO: 드롭다운 컴포넌트 구현 후 적용 */}
            <select
              value={backgroundMode}
              onChange={(event) => setBackgroundMode(event.target.value as BackgroundEffectMode)}
              className="text-text w-full rounded-lg bg-gray-300 py-2 text-sm"
              aria-label="배경 효과 선택"
            >
              <option value="blur">블러</option>
              <option value="image">플럼 배경</option>
              <option value="off">처리 안함</option>
            </select>
          </div>
        </div>
      </SidePanelContent>
    </>
  );
}
