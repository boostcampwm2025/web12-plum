import { RefObject, useEffect } from 'react';

/**
 * 특정 요소 외부 클릭을 감지하여 콜백 함수를 실행하는 커스텀 훅
 * @param refs 외부 클릭을 감지할 요소의 ref(단일 또는 배열)
 * @param isActive 훅 활성화 상태 (true일 때만 외부 클릭 감지)
 * @param onOutsideClick 외부 클릭 시 실행할 콜백 함수
 */
export function useOutsideClick(
  refs: RefObject<HTMLElement> | Array<RefObject<HTMLElement>>,
  isActive: boolean,
  onOutsideClick: () => void,
) {
  const refList = Array.isArray(refs) ? refs : [refs];
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const clickedInside = refList.some(
        (ref) => ref.current && ref.current.contains(event.target as Node),
      );
      if (!clickedInside) {
        onOutsideClick();
      }
    };

    if (isActive) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [refList, isActive, onOutsideClick]);
}
