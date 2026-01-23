import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useFormContext, useWatch, UseFormReturn } from 'react-hook-form';
import { LecturePresentationList } from './LecturePresentationList';
import '@testing-library/jest-dom';

vi.mock('react-hook-form', () => ({
  useFormContext: vi.fn(),
  useWatch: vi.fn(),
}));

describe('LecturePresentationList 테스트', () => {
  const mockSetValue = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useFormContext).mockReturnValue({
      setValue: mockSetValue,
    } as unknown as UseFormReturn);
  });

  it('파일이 없을 때 아무것도 렌더링하지 않아야 한다.', () => {
    vi.mocked(useWatch).mockReturnValue([]);

    const { container } = render(<LecturePresentationList />);

    expect(container.firstChild).toBeNull();
  });

  it('업로드된 파일들이 렌더링되어야 한다.', () => {
    const mockFiles = [
      new File(['content1'], 'test1.pdf', { type: 'application/pdf' }),
      new File(['content2'], 'test2.pptx', {
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      }),
    ];

    vi.mocked(useWatch).mockReturnValue(mockFiles);

    render(<LecturePresentationList />);

    expect(screen.getByText('test1.pdf')).toBeInTheDocument();
    expect(screen.getByText('test2.pptx')).toBeInTheDocument();
  });

  it('파일 크기가 정확하게 포맷되어 표시되어야 한다.', () => {
    const mockFile = new File(['a'.repeat(1024)], 'test.pdf', { type: 'application/pdf' });

    vi.mocked(useWatch).mockReturnValue([mockFile]);

    render(<LecturePresentationList />);

    expect(screen.getByText(/KB/)).toBeInTheDocument();
  });

  it('삭제 버튼을 클릭하면 파일이 삭제되어야 한다.', () => {
    const mockFiles = [
      new File(['content1'], 'test1.pdf', { type: 'application/pdf' }),
      new File(['content2'], 'test2.pptx', {
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      }),
    ];

    vi.mocked(useWatch).mockReturnValue(mockFiles);

    render(<LecturePresentationList />);

    const deleteButtons = screen.getAllByRole('button', { name: '파일 삭제' });
    fireEvent.click(deleteButtons[0]);

    expect(mockSetValue).toHaveBeenCalledWith('presentationFiles', [mockFiles[1]], {
      shouldValidate: true,
    });
  });

  it('여러 파일의 삭제 버튼이 개별적으로 동작해야 한다.', () => {
    const mockFiles = [
      new File(['content1'], 'test1.pdf', { type: 'application/pdf' }),
      new File(['content2'], 'test2.pptx', {
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      }),
      new File(['content3'], 'test3.pdf', { type: 'application/pdf' }),
    ];

    vi.mocked(useWatch).mockReturnValue(mockFiles);

    render(<LecturePresentationList />);

    const deleteButtons = screen.getAllByRole('button', { name: '파일 삭제' });
    fireEvent.click(deleteButtons[1]);

    expect(mockSetValue).toHaveBeenCalledWith('presentationFiles', [mockFiles[0], mockFiles[2]], {
      shouldValidate: true,
    });
  });
});
