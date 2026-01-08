import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Label } from './Label';

describe('Label', () => {
  it('children이 렌더링된다', () => {
    render(<Label>닉네임</Label>);
    expect(screen.getByText('닉네임')).toBeInTheDocument();
  });

  it('htmlFor 속성이 적용된다', () => {
    render(<Label htmlFor="username">닉네임</Label>);
    const label = screen.getByText('닉네임');
    expect(label).toHaveAttribute('for', 'username');
  });

  it('required가 true일 때 별표(*)가 표시된다', () => {
    render(<Label required>필수 항목</Label>);
    expect(screen.getByText('*')).toBeInTheDocument();
    expect(screen.getByText('*')).toHaveClass('text-primary');
  });

  it('required가 false일 때 별표(*)가 표시되지 않는다', () => {
    render(<Label>선택 항목</Label>);
    expect(screen.queryByText('*')).not.toBeInTheDocument();
  });

  it('size variant가 적용된다', () => {
    const { container } = render(<Label size="lg">큰 라벨</Label>);
    const label = container.querySelector('label');
    expect(label).toHaveClass('text-xl');
  });

  it('커스텀 className이 적용된다', () => {
    const { container } = render(<Label className="custom-class">커스텀</Label>);
    const label = container.querySelector('label');
    expect(label).toHaveClass('custom-class');
  });
});
