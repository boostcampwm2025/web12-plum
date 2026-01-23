import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Modal } from './Modal';

describe('Modal Component', () => {
  const mockOnClose = vi.fn();
  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    children: <div>Modal Content</div>,
  };

  beforeEach(() => {
    mockOnClose.mockClear();
  });

  afterEach(() => {
    document.body.style.overflow = '';
  });

  describe('렌더링', () => {
    it('isOpen이 true일 때 모달이 렌더링된다', () => {
      const props = { ...defaultProps, isOpen: true };
      render(<Modal {...props} />);

      expect(screen.getByText('Modal Content')).toBeInTheDocument();
    });

    it('isOpen이 false일 때 모달이 렌더링되지 않는다', () => {
      const props = { ...defaultProps, isOpen: false };
      render(<Modal {...props} />);

      expect(screen.queryByText('Modal Content')).not.toBeInTheDocument();
    });

    it('className prop이 적용된다', () => {
      const props = { ...defaultProps, className: 'custom-class' };
      render(<Modal {...props} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveClass('custom-class');
    });
  });

  describe('모달 닫기', () => {
    it('ESC 키를 누르면 onClose가 호출된다', () => {
      render(<Modal {...defaultProps} />);
      fireEvent.keyDown(document, { key: 'Escape' });

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('배경을 클릭하면 onClose가 호출된다', () => {
      render(<Modal {...defaultProps} />);
      const dialog = screen.getByRole('dialog');
      const backdrop = dialog.parentElement;

      if (backdrop) {
        fireEvent.click(backdrop);
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      }
    });

    it('모달 컨텐츠를 클릭하면 onClose가 호출되지 않는다', () => {
      render(<Modal {...defaultProps} />);
      const content = screen.getByText('Modal Content');
      fireEvent.click(content);

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('dialog를 직접 클릭하면 onClose가 호출되지 않는다', () => {
      render(<Modal {...defaultProps} />);
      const dialog = screen.getByRole('dialog');
      fireEvent.click(dialog);

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('isOpen이 false일 때 ESC 키를 눌러도 onClose가 호출되지 않는다', () => {
      render(
        <Modal
          {...defaultProps}
          isOpen={false}
        />,
      );
      fireEvent.keyDown(document, { key: 'Escape' });

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('body 스크롤 잠금', () => {
    it('모달이 열리면 body 스크롤이 잠긴다', async () => {
      render(<Modal {...defaultProps} />);

      expect(document.body.getAttribute('style')).toContain('overflow: hidden');
    });

    it('isOpen이 false일 때는 body 스크롤이 잠기지 않는다', () => {
      render(
        <Modal
          {...defaultProps}
          isOpen={false}
        />,
      );

      const style = document.body.getAttribute('style');
      if (style) {
        expect(style).not.toContain('overflow: hidden');
      } else {
        expect(style).toBeNull();
      }
    });
  });

  describe('children 렌더링', () => {
    it('복잡한 children을 렌더링할 수 있다', () => {
      const complexChildren = (
        <div>
          <h1>Title</h1>
          <p>Description</p>
          <button>Action</button>
        </div>
      );
      render(<Modal {...defaultProps}>{complexChildren}</Modal>);

      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByText('Description')).toBeInTheDocument();
      expect(screen.getByText('Action')).toBeInTheDocument();
    });
  });
});
