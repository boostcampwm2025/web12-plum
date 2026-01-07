import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import RoomMenuBar from './RoomMenuBar';

describe('RoomMenuBar', () => {
  it('강의실 제목이 렌더링된다', () => {
    render(<RoomMenuBar roomTitle="네부캠 마스터 클래스" />);

    expect(screen.getByText('네부캠 마스터 클래스')).toBeInTheDocument();
  });

  it('모든 버튼이 렌더링된다 (메인 6 + 나가기 1 + 사이드 3)', () => {
    render(<RoomMenuBar />);

    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBe(10);
  });

  it('미디어(mic, cam, screen-share) 버튼 클릭 시 각 핸들러가 호출된다', async () => {
    const user = userEvent.setup();
    const onMicToggle = vi.fn();
    const onCameraToggle = vi.fn();
    const onScreenShareToggle = vi.fn();

    render(
      <RoomMenuBar
        onMicToggle={onMicToggle}
        onCameraToggle={onCameraToggle}
        onScreenShareToggle={onScreenShareToggle}
      />,
    );

    const buttons = screen.getAllByRole('button');
    await user.click(buttons[0]);
    await user.click(buttons[1]);
    await user.click(buttons[2]);

    expect(onMicToggle).toHaveBeenCalledTimes(1);
    expect(onCameraToggle).toHaveBeenCalledTimes(1);
    expect(onScreenShareToggle).toHaveBeenCalledTimes(1);
  });

  it('다이어로그 버튼(vote) 클릭 시 onDialogChange가 호출된다', async () => {
    const user = userEvent.setup();
    const onDialogChange = vi.fn();

    render(<RoomMenuBar onDialogChange={onDialogChange} />);

    const buttons = screen.getAllByRole('button');
    await user.click(buttons[3]);

    expect(onDialogChange).toHaveBeenNthCalledWith(1, 'vote');
  });

  it('사이드패널 버튼(chat) 클릭 시 onSidePanelChange가 호출된다', async () => {
    const user = userEvent.setup();
    const onSidePanelChange = vi.fn();

    render(<RoomMenuBar onSidePanelChange={onSidePanelChange} />);

    const buttons = screen.getAllByRole('button');
    await user.click(buttons[7]);

    expect(onSidePanelChange).toHaveBeenCalledWith('chat');
  });

  it('나가기 버튼 클릭 시 onExit이 호출된다', async () => {
    const user = userEvent.setup();
    const onExit = vi.fn();

    render(<RoomMenuBar onExit={onExit} />);

    const buttons = screen.getAllByRole('button');
    await user.click(buttons[6]);
    expect(onExit).toHaveBeenCalledTimes(1);
  });
});
