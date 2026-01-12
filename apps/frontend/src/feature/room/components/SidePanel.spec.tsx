import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { SidePanel, SidePanelHeader, SidePanelContent } from './SidePanel';

vi.mock('@/shared/components/icon/Icon', () => ({
  Icon: ({ name, size, className }: { name: string; size?: number; className?: string }) => (
    <svg
      data-testid="icon"
      data-size={size}
      className={className}
    >
      {name}
    </svg>
  ),
}));

vi.mock('@/shared/components/Button', () => ({
  Button: ({
    children,
    onClick,
    className,
    'aria-label': ariaLabel,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
    'aria-label'?: string;
  }) => (
    <button
      onClick={onClick}
      className={className}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  ),
}));

describe('SidePanel', () => {
  it('children이 렌더링된다', () => {
    render(
      <SidePanel>
        <div>사이드 패널 내용</div>
      </SidePanel>,
    );

    expect(screen.getByText('사이드 패널 내용')).toBeInTheDocument();
  });
});

describe('SidePanelHeader', () => {
  const defaultProps = {
    title: '사이드 패널 제목',
    onClose: vi.fn(),
  };

  it('제목이 렌더링된다', () => {
    render(<SidePanelHeader {...defaultProps} />);

    expect(screen.getByText('사이드 패널 제목')).toBeInTheDocument();
  });

  it('닫기 버튼이 렌더링된다', () => {
    render(<SidePanelHeader {...defaultProps} />);

    const closeButton = screen.getByLabelText('닫기');
    expect(closeButton).toBeInTheDocument();

    const icon = screen.getByTestId('icon');
    expect(icon).toHaveTextContent('x');
    expect(icon).toHaveAttribute('data-size', '24');
  });

  it('닫기 버튼 클릭 시 onClose가 호출된다', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <SidePanelHeader
        {...defaultProps}
        onClose={onClose}
      />,
    );

    const closeButton = screen.getByLabelText('닫기');
    await user.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('onBack이 없을 때 뒤로가기 버튼이 렌더링되지 않는다', () => {
    render(<SidePanelHeader {...defaultProps} />);

    expect(screen.queryByLabelText('뒤로가기')).not.toBeInTheDocument();
  });

  it('onBack이 있을 때 뒤로가기 버튼이 렌더링된다', () => {
    const onBack = vi.fn();

    render(
      <SidePanelHeader
        {...defaultProps}
        onBack={onBack}
      />,
    );

    const backButton = screen.getByLabelText('뒤로가기');
    expect(backButton).toBeInTheDocument();

    const icons = screen.getAllByTestId('icon');
    const chevronIcon = icons.find((icon) => icon.textContent === 'chevron');
    expect(chevronIcon).toBeDefined();
    expect(chevronIcon).toHaveAttribute('data-size', '24');
    expect(chevronIcon).toHaveClass('rotate-90');
  });

  it('뒤로가기 버튼 클릭 시 onBack이 호출된다', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();

    render(
      <SidePanelHeader
        {...defaultProps}
        onBack={onBack}
      />,
    );

    const backButton = screen.getByLabelText('뒤로가기');
    await user.click(backButton);

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

describe('SidePanelContent', () => {
  it('children이 렌더링된다', () => {
    render(
      <SidePanelContent>
        <div>컨텐츠 내용</div>
      </SidePanelContent>,
    );

    expect(screen.getByText('컨텐츠 내용')).toBeInTheDocument();
  });
});

describe('SidePanel 통합 테스트', () => {
  it('SidePanel, SidePanelHeader, SidePanelContent가 함께 작동한다', () => {
    const onClose = vi.fn();
    const onBack = vi.fn();

    render(
      <SidePanel>
        <SidePanelHeader
          title="채팅"
          onClose={onClose}
          onBack={onBack}
        />
        <SidePanelContent>
          <div>채팅 메시지 목록</div>
        </SidePanelContent>
      </SidePanel>,
    );

    expect(screen.getByText('채팅')).toBeInTheDocument();
    expect(screen.getByText('채팅 메시지 목록')).toBeInTheDocument();
    expect(screen.getByLabelText('닫기')).toBeInTheDocument();
    expect(screen.getByLabelText('뒤로가기')).toBeInTheDocument();
  });

  it('통합된 컴포넌트에서 버튼 클릭이 정상 작동한다', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onBack = vi.fn();

    render(
      <SidePanel>
        <SidePanelHeader
          title="정보"
          onClose={onClose}
          onBack={onBack}
        />
        <SidePanelContent>
          <div>정보 내용</div>
        </SidePanelContent>
      </SidePanel>,
    );

    await user.click(screen.getByLabelText('닫기'));
    expect(onClose).toHaveBeenCalledTimes(1);

    await user.click(screen.getByLabelText('뒤로가기'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
