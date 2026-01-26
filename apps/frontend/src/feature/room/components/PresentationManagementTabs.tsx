import { AnimatePresence, motion } from 'motion/react';
import { useEffect } from 'react';
import { Button } from '@/shared/components/Button';
import { Icon } from '@/shared/components/icon/Icon';
import { useRoomPresentation } from '../hooks/useRoomPresentation';
import { PresentationFile } from '@/feature/room/types.ts';
import { formatFileSize } from '@/shared/lib/presentations.ts';

// TODO: file 업로드/업로드 중 취소/삭제 기능 추가
export function PresentationManagementTabs() {
  const { files, isLoading, fetchPresentation } = useRoomPresentation();

  useEffect(() => {
    fetchPresentation();
  }, [fetchPresentation]);

  return (
    <div className="flex min-h-0 flex-1 flex-col px-4">
      {/* 헤더 섹션 (필요 시 제목 추가) */}

      <AnimatePresence mode="wait">
        <motion.div
          key={isLoading ? 'loading' : 'content'}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <PresentationFileList
            files={files}
            isLoading={isLoading}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

interface PresentationFileListProps {
  files: PresentationFile[];
  isLoading: boolean;
}

function PresentationFileList({ files, isLoading }: PresentationFileListProps) {
  if (isLoading) {
    return (
      <div className="text-subtext flex flex-1 items-center justify-center py-10 text-sm font-bold">
        자료를 불러오는 중...
      </div>
    );
  }

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col items-center gap-4">
      {/* 리스트 영역 */}
      <div className="flex min-h-0 w-full flex-1 flex-col gap-3 overflow-y-auto pr-1">
        {files.length === 0 ? (
          <div className="text-subtext flex flex-1 items-center justify-center text-sm font-bold opacity-60">
            업로드된 발표 자료가 없습니다.
          </div>
        ) : (
          files.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex items-center justify-between gap-4 rounded-lg bg-gray-400 p-4 text-white shadow-sm"
            >
              <div className="flex flex-col gap-3">
                <span className="truncate text-sm font-medium">{file.name}</span>
                <span className="text-subtext truncate text-xs">{formatFileSize(file.size)}</span>
              </div>
              <Button
                variant="icon"
                as="a"
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 transition-colors hover:bg-gray-500"
              >
                <Icon
                  name="trash"
                  className="text-error"
                  size={20}
                />
              </Button>
            </div>
          ))
        )}
      </div>
      <span className="truncate text-lg font-bold">총 {files.length}개 파일</span>
    </div>
  );
}
