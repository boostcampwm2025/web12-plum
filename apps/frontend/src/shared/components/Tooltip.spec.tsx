import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import Tooltip from './Tooltip';

describe('Tooltip', () => {
  it('children이 렌더링된다', () => {
    render(
      <Tooltip content="도움말">
        <button>버튼</button>
      </Tooltip>,
    );
    expect(screen.getByRole('button', { name: '버튼' })).toBeInTheDocument();
  });

  it('초기에는 tooltip이 보이지 않는다', () => {
    render(
      <Tooltip content="도움말">
        <button>버튼</button>
      </Tooltip>,
    );
    const tooltip = screen.getByText('도움말');
    expect(tooltip).toHaveClass('opacity-0');
  });

  it('hover 시 tooltip이 표시된다', async () => {
    const user = userEvent.setup();

    render(
      <Tooltip content="도움말">
        <button>버튼</button>
      </Tooltip>,
    );

    const button = screen.getByRole('button');
    await user.hover(button);

    const tooltip = screen.getByText('도움말');
    expect(tooltip).toHaveClass('group-hover:opacity-100');
  });

  it('content가 올바르게 표시된다', () => {
    render(
      <Tooltip content="이것은 도움말입니다">
        <button>버튼</button>
      </Tooltip>,
    );
    expect(screen.getByText('이것은 도움말입니다')).toBeInTheDocument();
  });
});
