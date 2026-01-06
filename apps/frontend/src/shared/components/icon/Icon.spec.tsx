import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { Icon } from './Icon';
import { iconMap } from './iconMap';

describe('Icon Component', () => {
  describe('렌더링', () => {
    it('유효한 아이콘 이름으로 렌더링된다', () => {
      const iconName = 'mic';
      const { container } = render(<Icon name={iconName} />);

      expect(container.firstChild).toBeTruthy();
    });

    it('잘못된 아이콘 이름일 때 null을 반환한다', () => {
      const invalidIconName = 'invalid-icon';
      const { container } = render(<Icon name={invalidIconName} />);
      expect(container.firstChild).toBeNull();
    });

    it('개발 모드에서 잘못된 아이콘 이름일 때 경고를 출력한다', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const invalidIconName = 'invalid-icon';

      render(<Icon name={invalidIconName} />);
      expect(consoleWarnSpy).toHaveBeenCalledWith('Icon "invalid-icon"을 찾을 수 없습니다.');

      consoleWarnSpy.mockRestore();
    });
  });

  describe('모든 아이콘', () => {
    const iconNames = Object.keys(iconMap) as Array<keyof typeof iconMap>;

    iconNames.forEach((iconName) => {
      it(`${iconName} 아이콘이 렌더링된다`, () => {
        const { container } = render(<Icon name={iconName} />);

        expect(container.firstChild).toBeTruthy();
      });
    });
  });

  describe('조합 테스트', () => {
    it('모든 props를 함께 사용할 수 있다', () => {
      const props = {
        name: 'mic' as const,
        size: 48,
        className: 'text-red-500',
        label: '마이크',
        decorative: false,
      };
      const { container } = render(<Icon {...props} />);

      expect(container.firstChild).toBeTruthy();
    });

    describe('컴포넌트 안정성', () => {
      it('props 없이도 렌더링된다', () => {
        const { container } = render(<Icon name="mic" />);

        expect(container.firstChild).toBeTruthy();
      });
    });
  });
});
