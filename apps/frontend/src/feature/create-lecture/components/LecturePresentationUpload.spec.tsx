import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LecturePresentationUpload } from './LecturePresentationUpload';
import { validateFileForUpload } from '../../../shared/lib/presentation';
import '@testing-library/jest-dom';

vi.mock('../../../shared/lib/presentation', () => ({
  validateFileForUpload: vi.fn(),
}));

vi.mock('../../../shared/hooks/useDragAndDrop', () => ({
  useDragAndDrop: vi.fn(() => ({
    isDragging: false,
    dragHandlers: {},
  })),
}));

describe('LecturePresentationUpload 테스트', () => {
  const mockOnFileSelect = vi.fn();
  const mockOnValidationError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('파일 업로드 영역이 렌더링되어야 한다.', () => {
    render(
      <LecturePresentationUpload
        onFileSelect={mockOnFileSelect}
        onValidationError={mockOnValidationError}
      />,
    );

    expect(screen.getByText('파일을 선택하거나 드래그하세요')).toBeInTheDocument();
  });

  it('파일 선택 버튼을 클릭하면 파일 input이 클릭되어야 한다.', () => {
    render(
      <LecturePresentationUpload
        onFileSelect={mockOnFileSelect}
        onValidationError={mockOnValidationError}
      />,
    );

    const fileInput = screen.getByLabelText('파일 업로드') as HTMLInputElement;
    const uploadButton = screen.getByRole('button', { name: '파일 선택 또는 드래그하여 업로드' });

    const clickSpy = vi.spyOn(fileInput, 'click');

    fireEvent.click(uploadButton);

    expect(clickSpy).toHaveBeenCalled();
  });

  it('유효한 파일이 선택되면 onFileSelect가 호출되어야 한다.', () => {
    vi.mocked(validateFileForUpload).mockReturnValue(null);

    render(
      <LecturePresentationUpload
        onFileSelect={mockOnFileSelect}
        onValidationError={mockOnValidationError}
      />,
    );

    const fileInput = screen.getByLabelText('파일 업로드') as HTMLInputElement;
    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(mockOnFileSelect).toHaveBeenCalledWith(file);
    expect(mockOnValidationError).not.toHaveBeenCalled();
  });

  it('유효하지 않은 파일이 선택되면 onValidationError가 호출되어야 한다.', () => {
    const errorMessage = '파일 크기가 너무 큽니다.';
    vi.mocked(validateFileForUpload).mockReturnValue(errorMessage);

    render(
      <LecturePresentationUpload
        onFileSelect={mockOnFileSelect}
        onValidationError={mockOnValidationError}
      />,
    );

    const fileInput = screen.getByLabelText('파일 업로드') as HTMLInputElement;
    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(mockOnValidationError).toHaveBeenCalledWith(errorMessage);
    expect(mockOnFileSelect).not.toHaveBeenCalled();
  });
});
