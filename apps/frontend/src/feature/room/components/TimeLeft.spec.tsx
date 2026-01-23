import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { TimeLeft } from './TimeLeft';

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

describe('TimeLeft', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('시간이 흐르면 카운트다운되고 0에서 멈춘다', async () => {
    const start = new Date('2024-01-01T00:00:00.000Z');
    vi.setSystemTime(start);

    render(
      <TimeLeft
        timeLimitSeconds={2}
        startedAt={start.getTime()}
      />,
    );

    expect(screen.getByText('00:02')).toBeInTheDocument();

    await vi.advanceTimersByTimeAsync(1000);
    expect(screen.getByText('00:01')).toBeInTheDocument();

    await vi.advanceTimersByTimeAsync(1000);
    expect(screen.getByText('00:00')).toBeInTheDocument();

    await vi.advanceTimersByTimeAsync(2000);
    expect(screen.getByText('00:00')).toBeInTheDocument();
  });
});
