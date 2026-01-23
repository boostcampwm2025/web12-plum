import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PresentationList } from './PresentationList';
import '@testing-library/jest-dom';

describe('PresentationList 테스트', () => {
  const mockOnDelete = vi.fn();

  const createMockFile = (name: string, sizeInBytes: number) => {
    const file = new File(['a'.repeat(sizeInBytes)], name);
    return file;
  };

  it('파일이 없을 때 아무것도 렌더링하지 않아야 한다.', () => {
    const { container } = render(
      <PresentationList
        files={[]}
        onDelete={mockOnDelete}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('업로드된 파일들이 리스트에 렌더링되어야 한다.', () => {
    const mockFiles = [createMockFile('test1.pdf', 1024), createMockFile('test2.pptx', 2048)];

    render(
      <PresentationList
        files={mockFiles}
        onDelete={mockOnDelete}
      />,
    );

    expect(screen.getByText('test1.pdf')).toBeInTheDocument();
    expect(screen.getByText('test2.pptx')).toBeInTheDocument();
  });

  it('파일 크기가 포맷되어 올바르게 표시되어야 한다.', () => {
    const mockFiles = [createMockFile('size-test.pdf', 1024)];

    render(
      <PresentationList
        files={mockFiles}
        onDelete={mockOnDelete}
      />,
    );

    expect(screen.getByText(/1\.0 KB/i)).toBeInTheDocument();
  });

  it('삭제 버튼 클릭 시 해당 파일의 인덱스와 함께 onDelete가 호출되어야 한다.', () => {
    const mockFiles = [createMockFile('file1.pdf', 100), createMockFile('file2.pdf', 200)];

    render(
      <PresentationList
        files={mockFiles}
        onDelete={mockOnDelete}
      />,
    );

    const deleteButtons = screen.getAllByRole('button', { name: '파일 삭제' });
    fireEvent.click(deleteButtons[1]);

    expect(mockOnDelete).toHaveBeenCalledTimes(1);
    expect(mockOnDelete).toHaveBeenCalledWith(1);
  });
});
