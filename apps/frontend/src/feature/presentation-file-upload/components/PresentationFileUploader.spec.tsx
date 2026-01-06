import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PresentationFileUploader } from './PresentationFileUploader';

describe('PresentationFileUploader Component', () => {
  const mockOnFileSelect = vi.fn();
  const mockOnValidationError = vi.fn();

  const defaultProps = {
    onFileSelect: mockOnFileSelect,
    onValidationError: mockOnValidationError,
    children: <div>Upload Area</div>,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('렌더링', () => {
    it('children을 렌더링한다', () => {
      render(<PresentationFileUploader {...defaultProps} />);

      expect(screen.getByText('Upload Area')).toBeTruthy();
    });

    it('파일 input이 숨겨진 상태로 렌더링된다', () => {
      render(<PresentationFileUploader {...defaultProps} />);

      const input = screen.getByLabelText('파일 업로드');
      expect(input).toHaveClass('hidden');
    });
  });

  describe('파일 선택', () => {
    it('유효한 PDF 파일 선택 시 onFileSelect가 호출된다', () => {
      render(<PresentationFileUploader {...defaultProps} />);

      const file = new File(['content'], 'presentation.pdf', { type: 'application/pdf' });
      const input = screen.getByLabelText('파일 업로드') as HTMLInputElement;

      fireEvent.change(input, { target: { files: [file] } });

      expect(mockOnFileSelect).toHaveBeenCalledWith(file);
      expect(mockOnValidationError).not.toHaveBeenCalled();
    });

    it('유효한 PPT 파일 선택 시 onFileSelect가 호출된다', () => {
      render(<PresentationFileUploader {...defaultProps} />);

      const file = new File(['content'], 'presentation.ppt', {
        type: 'application/vnd.ms-powerpoint',
      });
      const input = screen.getByLabelText('파일 업로드') as HTMLInputElement;

      fireEvent.change(input, { target: { files: [file] } });

      expect(mockOnFileSelect).toHaveBeenCalledWith(file);
      expect(mockOnValidationError).not.toHaveBeenCalled();
    });

    it('유효한 PPTX 파일 선택 시 onFileSelect가 호출된다', () => {
      render(<PresentationFileUploader {...defaultProps} />);

      const file = new File(['content'], 'presentation.pptx', {
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      });
      const input = screen.getByLabelText('파일 업로드') as HTMLInputElement;

      fireEvent.change(input, { target: { files: [file] } });

      expect(mockOnFileSelect).toHaveBeenCalledWith(file);
      expect(mockOnValidationError).not.toHaveBeenCalled();
    });

    it('유효하지 않은 파일 선택 시 onValidationError가 호출된다', () => {
      render(<PresentationFileUploader {...defaultProps} />);

      const file = new File(['content'], 'document.txt', { type: 'text/plain' });
      const input = screen.getByLabelText('파일 업로드') as HTMLInputElement;
      fireEvent.change(input, { target: { files: [file] } });

      expect(mockOnValidationError).toHaveBeenCalled();
      expect(mockOnFileSelect).not.toHaveBeenCalled();
    });

    it('파일 선택 후 input value가 초기화된다', () => {
      render(<PresentationFileUploader {...defaultProps} />);

      const file = new File(['content'], 'presentation.pdf', { type: 'application/pdf' });
      const input = screen.getByLabelText('파일 업로드') as HTMLInputElement;
      Object.defineProperty(input, 'value', {
        writable: true,
        value: 'presentation.pdf',
      });
      fireEvent.change(input, { target: { files: [file], value: '' } });

      expect(input.value).toBe('');
    });

    it('파일이 선택되지 않았을 때 아무 동작도 하지 않는다', () => {
      render(<PresentationFileUploader {...defaultProps} />);

      const input = screen.getByLabelText('파일 업로드') as HTMLInputElement;
      fireEvent.change(input, { target: { files: [] } });

      expect(mockOnFileSelect).not.toHaveBeenCalled();
      expect(mockOnValidationError).not.toHaveBeenCalled();
    });
  });

  describe('버튼 클릭', () => {
    it('버튼 클릭 시 파일 input이 클릭된다', () => {
      render(<PresentationFileUploader {...defaultProps} />);

      const button = screen.getByLabelText('파일 선택 또는 드래그하여 업로드');
      const input = screen.getByLabelText('파일 업로드') as HTMLInputElement;
      const inputClickSpy = vi.spyOn(input, 'click');

      fireEvent.click(button);

      expect(inputClickSpy).toHaveBeenCalled();
    });
  });

  describe('드래그 앤 드롭', () => {
    it('드래그 오버 시 스타일이 변경된다', () => {
      render(<PresentationFileUploader {...defaultProps} />);

      const button = screen.getByLabelText('파일 선택 또는 드래그하여 업로드');
      fireEvent.dragEnter(button);

      expect(button).toHaveClass('border-primary', 'bg-primary/20');
    });

    it('유효한 파일 드롭 시 onFileSelect가 호출된다', () => {
      render(<PresentationFileUploader {...defaultProps} />);
      const file = new File(['content'], 'presentation.pdf', { type: 'application/pdf' });
      const button = screen.getByLabelText('파일 선택 또는 드래그하여 업로드');
      fireEvent.drop(button, {
        dataTransfer: {
          files: [file],
        },
      });

      expect(mockOnFileSelect).toHaveBeenCalledWith(file);
    });
  });

  describe('className props', () => {
    it('추가 className이 적용된다', () => {
      render(
        <PresentationFileUploader
          {...defaultProps}
          className="custom-class"
        />,
      );

      const button = screen.getByLabelText('파일 선택 또는 드래그하여 업로드');

      expect(button).toHaveClass('custom-class');
    });
  });
});
