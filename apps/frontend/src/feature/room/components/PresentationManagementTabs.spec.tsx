import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { PresentationManagementTabs } from './PresentationManagementTabs';
import { useRoomPresentation } from '../hooks/useRoomPresentation';

// 훅 모킹
vi.mock('../hooks/useRoomPresentation', () => ({
  useRoomPresentation: vi.fn(),
}));

// Icon 컴포넌트 모킹
vi.mock('@/shared/components/icon/Icon', () => ({
  Icon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`}>{name}</span>,
}));

describe('PresentationManagementTabs', () => {
  const mockFetchPresentation = vi.fn();
  const mockedUseRoomPresentation = vi.mocked(useRoomPresentation);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('로딩 중일 때 로딩 메시지를 표시한다', () => {
    // 훅의 반환값 설정 (로딩 중)
    mockedUseRoomPresentation.mockReturnValue({
      files: [],
      isLoading: true,
      error: '',
      fetchPresentation: mockFetchPresentation,
    });

    render(<PresentationManagementTabs />);

    expect(screen.getByText('자료를 불러오는 중...')).toBeInTheDocument();
    expect(mockFetchPresentation).toHaveBeenCalledTimes(1);
  });

  it('업로드된 파일이 없을 때 빈 상태 메시지를 표시한다', () => {
    // 훅의 반환값 설정 (데이터 없음)
    mockedUseRoomPresentation.mockReturnValue({
      files: [],
      isLoading: false,
      error: '',
      fetchPresentation: mockFetchPresentation,
    });

    render(<PresentationManagementTabs />);

    expect(screen.getByText('업로드된 발표 자료가 없습니다.')).toBeInTheDocument();
    expect(screen.getByText('총 0개 파일')).toBeInTheDocument();
  });

  it('파일 리스트가 있을 때 파일명과 포맷팅된 용량을 표시한다', () => {
    const mockFiles = [
      { name: '강의교안.pdf', url: 'https://s3.com/file1.pdf', size: 1024 * 1024 }, // 1.0 MB
      { name: '참고자료.zip', url: 'https://s3.com/file2.zip', size: 500 * 1024 }, // 500.0 KB
    ];

    mockedUseRoomPresentation.mockReturnValue({
      files: mockFiles,
      isLoading: false,
      error: '',
      fetchPresentation: mockFetchPresentation,
    });

    render(<PresentationManagementTabs />);

    // 파일명 렌더링 확인
    expect(screen.getByText('강의교안.pdf')).toBeInTheDocument();
    expect(screen.getByText('참고자료.zip')).toBeInTheDocument();

    // 용량 포맷팅 확인 (formatFileSize 유틸리티 동작 확인)
    expect(screen.getByText('1.0 MB')).toBeInTheDocument();
    expect(screen.getByText('500.0 KB')).toBeInTheDocument();

    // 하단 총 개수 확인
    expect(screen.getByText('총 2개 파일')).toBeInTheDocument();
  });

  it('각 파일 항목에 삭제(trash) 아이콘이 포함된 버튼이 렌더링된다', () => {
    const mockFiles = [{ name: 'test.pdf', url: 'https://test.com', size: 100 }];

    mockedUseRoomPresentation.mockReturnValue({
      files: mockFiles,
      isLoading: false,
      error: '',
      fetchPresentation: mockFetchPresentation,
    });

    render(<PresentationManagementTabs />);

    // trash 아이콘 버튼 확인
    const deleteButton = screen.getByRole('link'); // Button as="a" 이므로 link
    expect(deleteButton).toHaveAttribute('href', 'https://test.com');
    expect(screen.getByTestId('icon-trash')).toBeInTheDocument();
  });
});
