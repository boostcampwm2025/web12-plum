import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { ParticipantVideo } from './ParticipantVideo';
import type { VideoDisplayMode } from './ParticipantVideo';

vi.mock('@/shared/components/icon/Icon', () => ({
  Icon: ({ name, size }: { name: string; size?: number }) => (
    <svg
      data-testid="icon"
      data-size={size}
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

describe('ParticipantVideo', () => {
  const defaultProps = {
    id: 'participant-1',
    name: '홍길동',
    mode: 'pip' as VideoDisplayMode,
  };

  it('참가자 이름이 렌더링된다', () => {
    render(<ParticipantVideo {...defaultProps} />);

    expect(screen.getByText('홍길동')).toBeInTheDocument();
  });

  describe('minimize 모드', () => {
    it('minimize 모드일 때 비디오 영역이 렌더링되지 않는다', () => {
      const { container } = render(
        <ParticipantVideo
          {...defaultProps}
          mode="minimize"
        />,
      );

      const videoArea = container.querySelector('.bg-gray-200');
      expect(videoArea).not.toBeInTheDocument();
    });

    it('minimize 모드일 때 적절한 스타일 클래스가 적용된다', () => {
      const { container } = render(
        <ParticipantVideo
          {...defaultProps}
          mode="minimize"
        />,
      );

      const videoContainer = container.firstChild as HTMLElement;
      expect(videoContainer).toHaveClass('h-9', 'bg-gray-500');
    });

    it('minimize 모드에서 현재 사용자일 때 확대 버튼이 렌더링된다', () => {
      render(
        <ParticipantVideo
          {...defaultProps}
          mode="minimize"
          isCurrentUser
        />,
      );

      const maximizeButton = screen.getByLabelText('확대');
      expect(maximizeButton).toBeInTheDocument();

      const icon = screen.getByTestId('icon');
      expect(icon).toHaveTextContent('maximize');
      expect(icon).toHaveAttribute('data-size', '16');
    });

    it('minimize 모드에서 확대 버튼 클릭 시 onModeChange가 pip으로 호출된다', async () => {
      const user = userEvent.setup();
      const onModeChange = vi.fn();

      render(
        <ParticipantVideo
          {...defaultProps}
          mode="minimize"
          isCurrentUser
          onModeChange={onModeChange}
        />,
      );

      const maximizeButton = screen.getByLabelText('확대');
      await user.click(maximizeButton);

      expect(onModeChange).toHaveBeenCalledWith('pip');
      expect(onModeChange).toHaveBeenCalledTimes(1);
    });

    it('minimize 모드에서 현재 사용자가 아닐 때 확대 버튼이 렌더링되지 않는다', () => {
      render(
        <ParticipantVideo
          {...defaultProps}
          mode="minimize"
          isCurrentUser={false}
        />,
      );

      expect(screen.queryByLabelText('확대')).not.toBeInTheDocument();
    });
  });

  describe('pip 모드', () => {
    it('pip 모드일 때 비디오 영역이 렌더링된다', () => {
      const { container } = render(
        <ParticipantVideo
          {...defaultProps}
          mode="pip"
        />,
      );

      const videoArea = container.querySelector('.bg-gray-200');
      expect(videoArea).toBeInTheDocument();
    });

    it('pip 모드일 때 적절한 스타일 클래스가 적용된다', () => {
      const { container } = render(
        <ParticipantVideo
          {...defaultProps}
          mode="pip"
        />,
      );

      const videoContainer = container.firstChild as HTMLElement;
      expect(videoContainer).toHaveClass('h-28.5', 'shadow-md');
    });

    it('pip 모드에서 현재 사용자일 때 최소화 및 사이드바 버튼이 렌더링된다', () => {
      render(
        <ParticipantVideo
          {...defaultProps}
          mode="pip"
          isCurrentUser
        />,
      );

      expect(screen.getByLabelText('최소화')).toBeInTheDocument();
      expect(screen.getByLabelText('사이드바로 이동')).toBeInTheDocument();
    });

    it('pip 모드에서 최소화 버튼 클릭 시 onModeChange가 minimize로 호출된다', async () => {
      const user = userEvent.setup();
      const onModeChange = vi.fn();

      render(
        <ParticipantVideo
          {...defaultProps}
          mode="pip"
          isCurrentUser
          onModeChange={onModeChange}
        />,
      );

      const minimizeButton = screen.getByLabelText('최소화');
      await user.click(minimizeButton);

      expect(onModeChange).toHaveBeenCalledWith('minimize');
      expect(onModeChange).toHaveBeenCalledTimes(1);
    });

    it('pip 모드에서 사이드바 버튼 클릭 시 onModeChange가 side로 호출된다', async () => {
      const user = userEvent.setup();
      const onModeChange = vi.fn();

      render(
        <ParticipantVideo
          {...defaultProps}
          mode="pip"
          isCurrentUser
          onModeChange={onModeChange}
        />,
      );

      const sideButton = screen.getByLabelText('사이드바로 이동');
      await user.click(sideButton);

      expect(onModeChange).toHaveBeenCalledWith('side');
      expect(onModeChange).toHaveBeenCalledTimes(1);
    });

    it('pip 모드에서 현재 사용자가 아닐 때 컨트롤 버튼이 렌더링되지 않는다', () => {
      render(
        <ParticipantVideo
          {...defaultProps}
          mode="pip"
          isCurrentUser={false}
        />,
      );

      expect(screen.queryByLabelText('최소화')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('사이드바로 이동')).not.toBeInTheDocument();
    });
  });

  describe('side 모드', () => {
    it('side 모드일 때 비디오 영역이 렌더링된다', () => {
      const { container } = render(
        <ParticipantVideo
          {...defaultProps}
          mode="side"
        />,
      );

      const videoArea = container.querySelector('.bg-gray-200');
      expect(videoArea).toBeInTheDocument();
    });

    it('side 모드일 때 적절한 스타일 클래스가 적용된다', () => {
      const { container } = render(
        <ParticipantVideo
          {...defaultProps}
          mode="side"
        />,
      );

      const videoContainer = container.firstChild as HTMLElement;
      expect(videoContainer).toHaveClass('h-28.5');
      expect(videoContainer).not.toHaveClass('shadow-md');
    });

    it('side 모드에서 현재 사용자일 때 PIP 전환 버튼이 렌더링된다', () => {
      render(
        <ParticipantVideo
          {...defaultProps}
          mode="side"
          isCurrentUser
        />,
      );

      expect(screen.getByLabelText('PIP 모드로 전환')).toBeInTheDocument();
    });

    it('side 모드에서 PIP 버튼 클릭 시 onModeChange가 pip으로 호출된다', async () => {
      const user = userEvent.setup();
      const onModeChange = vi.fn();

      render(
        <ParticipantVideo
          {...defaultProps}
          mode="side"
          isCurrentUser
          onModeChange={onModeChange}
        />,
      );

      const pipButton = screen.getByLabelText('PIP 모드로 전환');
      await user.click(pipButton);

      expect(onModeChange).toHaveBeenCalledWith('pip');
      expect(onModeChange).toHaveBeenCalledTimes(1);
    });

    it('side 모드에서 현재 사용자가 아닐 때 PIP 버튼이 렌더링되지 않는다', () => {
      render(
        <ParticipantVideo
          {...defaultProps}
          mode="side"
          isCurrentUser={false}
        />,
      );

      expect(screen.queryByLabelText('PIP 모드로 전환')).not.toBeInTheDocument();
    });
  });

  describe('호버 컨트롤', () => {
    it('pip과 side 모드에서 현재 사용자일 때 호버 오버레이가 렌더링된다', () => {
      const { container: pipContainer } = render(
        <ParticipantVideo
          {...defaultProps}
          mode="pip"
          isCurrentUser
        />,
      );

      const { container: sideContainer } = render(
        <ParticipantVideo
          {...defaultProps}
          mode="side"
          isCurrentUser
        />,
      );

      const pipOverlay = pipContainer.querySelector('.bg-gray-700\\/40');
      const sideOverlay = sideContainer.querySelector('.bg-gray-700\\/40');

      expect(pipOverlay).toBeInTheDocument();
      expect(sideOverlay).toBeInTheDocument();
    });

    it('minimize 모드에서는 호버 오버레이가 렌더링되지 않는다', () => {
      const { container } = render(
        <ParticipantVideo
          {...defaultProps}
          mode="minimize"
          isCurrentUser
        />,
      );

      const overlay = container.querySelector('.bg-gray-700\\/40');
      expect(overlay).not.toBeInTheDocument();
    });
  });
});
