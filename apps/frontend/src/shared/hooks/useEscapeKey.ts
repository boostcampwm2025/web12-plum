import { useEffect } from 'react';

/**
 * ESC 키 이벤트를 감지하여 콜백 함수를 실행하는 커스텀 훅
 * @param isActive 훅 활성화 상태 (true일 때만 ESC 키 감지)
 * @param onEscape ESC 키 입력 시 실행할 콜백 함수
 */
export function useEscapeKey(isActive: boolean, onEscape: () => void) {
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onEscape();
      }
    };

    if (isActive) {
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isActive, onEscape]);
}
