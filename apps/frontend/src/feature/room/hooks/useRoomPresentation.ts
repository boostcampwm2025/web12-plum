import { useState, useCallback } from 'react';
import { logger } from '@/shared/lib/logger';
import { PresentationFile } from '../types';
import { SocketClient } from '@/shared/socket/socket';

export function useRoomPresentation() {
  const [files, setFiles] = useState<PresentationFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPresentation = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await SocketClient.emitWithAck('get_presentation');
      const formattedFiles = response.files.map((f) => {
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
    } catch (error) {
      logger.custom.error('[useRoomPresentation] 발표 자료 조회 실패:', error);
      setError('발표 자료를 가져오지 못했습니다.');
      return;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { files, isLoading, error, fetchPresentation };
}
