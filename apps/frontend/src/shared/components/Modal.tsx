import { MouseEvent, useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/shared/lib/utils';

/**
 * ESC 키로 모달 닫기 기능을 제공하는 커스텀 훅
 * @param isOpen 모달 열림 상태
 * @param onClose 모달 닫기 함수
 */
function useModalEscapeClose(isOpen: boolean, onClose: () => void) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);
}

/**
 * 모달 열림 시 body 스크롤 방지 기능을 제공하는 커스텀 훅
 * @param isOpen 모달 열림 상태
 */
function useModalBodyScrollLock(isOpen: boolean) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);
}

interface ModalOverlayProps {
  onClose: () => void;
  children: ReactNode;
}

/**
 * 모달 오버레이 컴포넌트
 * @param isOpen 모달 열림 상태
 * @param onClose 모달 닫기 함수
 * @param children 모달 내용
 * @returns 모달 오버레이 JSX 요소
 */
function ModalOverlay({ onClose, children }: ModalOverlayProps) {
  const handleBackdropClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-gray-700/75 px-4"
      onClick={handleBackdropClick}
    >
      {children}
    </div>,
    document.body,
  );
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

/**
 * 모달 컴포넌트
 * @param isOpen 모달 열림 상태
 * @param onClose 모달 닫기 함수
 * @param children 모달 내용
 * @param className 추가 클래스 이름
 * @returns 모달 JSX 요소
 */
export function Modal({ isOpen, onClose, children, className }: ModalProps) {
  useModalEscapeClose(isOpen, onClose);
  useModalBodyScrollLock(isOpen);

  if (!isOpen) return null;

  return (
    <ModalOverlay onClose={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className={cn('flex max-h-[90vh] w-full flex-col rounded-lg bg-gray-500 p-4', className)}
      >
        {children}
      </div>
    </ModalOverlay>
  );
}
