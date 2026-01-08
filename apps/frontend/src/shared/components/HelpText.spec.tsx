import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { HelpText } from './HelpText';

describe('HelpText', () => {
  it('children이 렌더링된다', () => {
    render(<HelpText>도움말 텍스트</HelpText>);
    expect(screen.getByText('도움말 텍스트')).toBeInTheDocument();
  });

  it('빈 문자열일 때 렌더링되지 않는다', () => {
    const { container } = render(<HelpText>{''}</HelpText>);
    expect(container.firstChild).toBeNull();
  });

  it('variant="error"일 때 에러 스타일이 적용된다', () => {
    const { container } = render(<HelpText variant="error">에러 메시지</HelpText>);
    const helpText = container.querySelector('p');
    expect(helpText).toHaveClass('text-error');
  });

  it('variant="success"일 때 성공 스타일이 적용된다', () => {
    const { container } = render(<HelpText variant="success">성공 메시지</HelpText>);
    const helpText = container.querySelector('p');
    expect(helpText).toHaveClass('text-success');
  });

  it('variant="default"일 때 기본 스타일이 적용된다', () => {
    const { container } = render(<HelpText variant="default">기본 메시지</HelpText>);
    const helpText = container.querySelector('p');
    expect(helpText).toHaveClass('text-subtext-light');
  });
});
