import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PresentationUploader } from './PresentationUploader';
import { useToastStore } from '../../../store/useToastStore';
import { PresentationError } from '../../../shared/hooks/usePresentation'; // 에러 클래스 임포트
import '@testing-library/jest-dom';

vi.mock('../../../store/useToastStore', () => ({
  useToastStore: vi.fn(),
}));

describe('PresentationUploader 테스트', () => {
  const mockAddFile = vi.fn();
  const mockAddToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToastStore).mockImplementation((selector: any) => {
      const mockState = {
        actions: { addToast: mockAddToast },
      };
      return selector(mockState);
    });
  });

  it('파일 선택 시 성공하면 성공 토스트를 띄워야 한다.', () => {
    mockAddFile.mockReturnValue(undefined);

    render(<PresentationUploader addFile={mockAddFile} />);

    const fileInput = screen.getByLabelText('파일 업로드');
    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(mockAddToast).toHaveBeenCalledWith({
      type: 'success',
      title: '파일이 성공적으로 추가되었습니다.',
    });
  });

  it('파일 추가 실패(PresentationError) 시 에러 토스트를 띄워야 한다.', () => {
    mockAddFile.mockImplementation(() => {
      throw new PresentationError('invalidMimeType');
    });

    render(<PresentationUploader addFile={mockAddFile} />);

    const fileInput = screen.getByLabelText('파일 업로드');
    const file = new File(['test'], 'invalid.txt');

    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(mockAddToast).toHaveBeenCalledWith({
      type: 'error',
      title: expect.stringContaining('파일만 업로드 가능합니다'),
    });
  });
});
