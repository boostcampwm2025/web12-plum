import { useState, useCallback } from 'react';
import { useSocketStore } from '@/store/useSocketStore';
import { logger } from '@/shared/lib/logger';
import { PresentationFile } from '../types';

export function useRoomPresentation() {
  const [files, setFiles] = useState<PresentationFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { emit } = useSocketStore((state) => state.actions);

  const fetchPresentation = useCallback(() => {
    setIsLoading(true);
    setError(null);

    emit('get_presentation', (res) => {
      if (res.success) {
        const formattedFiles = res.files.map((f) => {
          // URL에서 마지막 경로 부분(ulid_filename.ext)만 추출
          const fullFileName = f.url.split('/').pop() || '';

          const underscoreIndex = fullFileName.indexOf('_');
          const fileNameOnly =
            underscoreIndex !== -1 ? fullFileName.substring(underscoreIndex + 1) : fullFileName;

          return {
            name: decodeURIComponent(fileNameOnly),
            url: f.url,
            size: f.size,
          };
        });
        setFiles(formattedFiles);
      } else {
        setError(res.error || '발표 자료를 가져오지 못했습니다.');
        logger.socket.error('발표 자료 조회 실패:', res.error);
      }
      setIsLoading(false);
    });
  }, [emit]);

  return { files, isLoading, error, fetchPresentation };
}
