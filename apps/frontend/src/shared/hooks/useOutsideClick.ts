import { RefObject, useEffect } from 'react';

/**
 * 특정 요소 외부 클릭을 감지하여 콜백 함수를 실행하는 커스텀 훅
 * @param ref 외부 클릭을 감지할 요소의 ref
 * @param isActive 훅 활성화 상태 (true일 때만 외부 클릭 감지)
 * @param onOutsideClick 외부 클릭 시 실행할 콜백 함수
 */
export function useOutsideClick<T extends HTMLElement = HTMLElement>(
  ref: RefObject<T>,
  isActive: boolean,
  onOutsideClick: () => void,
) {
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onOutsideClick();
      }
    };

    if (isActive) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [ref, isActive, onOutsideClick]);
}
